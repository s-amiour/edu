import { generateJSON } from "./gemini-client.js";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";

type ContentFormat = "summary" | "flashcards" | "worked_example" | "analogy" | "quiz";

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  type: "mcq" | "short_answer";
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

interface WorkedExample {
  problem: string;
  steps: string[];
  solution: string;
}

interface GeneratedContent {
  format: ContentFormat;
  topicId: string;
  content: string | Flashcard[] | QuizQuestion[] | WorkedExample;
  citations: string[];
}

interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  similarity?: number;
}

const FORMAT_SCHEMAS: Record<ContentFormat, string> = {
  summary: `{
    "format": "summary",
    "topicId": "string",
    "content": "string (concise overview with key points)",
    "citations": ["string (source references)"]
  }`,
  flashcards: `{
    "format": "flashcards",
    "topicId": "string",
    "content": [{ "front": "string", "back": "string" }],
    "citations": ["string"]
  }`,
  worked_example: `{
    "format": "worked_example",
    "topicId": "string",
    "content": { "problem": "string", "steps": ["string"], "solution": "string" },
    "citations": ["string"]
  }`,
  analogy: `{
    "format": "analogy",
    "topicId": "string",
    "content": "string (relatable real-world analogy)",
    "citations": ["string"]
  }`,
  quiz: `{
    "format": "quiz",
    "topicId": "string",
    "content": [{ "type": "mcq | short_answer", "question": "string", "options": ["string"], "answer": "string", "explanation": "string" }],
    "citations": ["string"]
  }`,
};

async function fetchTopicDetails(topicId: string) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      objectives: true,
      module: { include: { course: true } },
    },
  });

  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  return topic;
}

async function fetchPrerequisiteTopics(topicId: string) {
  const prereqs = await prisma.topicPrerequisite.findMany({
    where: { dependentTopicId: topicId },
    include: { prerequisiteTopic: true },
  });

  return prereqs.map((p) => ({
    id: p.prerequisiteTopic.id,
    name: p.prerequisiteTopic.name,
    description: p.prerequisiteTopic.description,
  }));
}

async function fetchRelatedChunks(topicId: string, topicName: string): Promise<DocumentChunk[]> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { embedding: true },
  });

  if (topic?.embedding) {
    const results = await prisma.$queryRaw<DocumentChunk[]>`
      SELECT
        dc.id,
        dc.content,
        dc.source,
        1 - (dc.embedding <=> ${topic.embedding}::vector) AS similarity
      FROM document_chunks dc
      ORDER BY dc.embedding <=> ${topic.embedding}::vector
      LIMIT 10
    `;
    return results;
  }

  const results = await prisma.documentChunk.findMany({
    where: {
      OR: [
        { content: { contains: topicName, mode: "insensitive" } },
        { tags: { has: topicName } },
      ],
    },
    select: { id: true, content: true, source: true },
    take: 10,
  });

  return results.map((r) => ({ ...r, similarity: undefined }));
}

function buildFormatInstructions(format: ContentFormat): string {
  switch (format) {
    case "summary":
      return "Create a concise overview covering key points. Include definitions, core concepts, and their relationships. Keep it under 500 words.";
    case "flashcards":
      return "Create 8-12 flashcard pairs. Front should be a question/term, back should be a clear answer/definition. Cover all learning objectives.";
    case "worked_example":
      return "Present a realistic problem, then solve it step-by-step. Show your reasoning at each step. Connect to the learning objectives.";
    case "analogy":
      return "Create a relatable real-world analogy that captures the essence of this topic. Make it memorable and accurate. Explain where the analogy maps and where it breaks down.";
    case "quiz":
      return "Create 5-8 questions mixing MCQ and short answer. Cover all learning objectives. Include correct answers and brief explanations.";
  }
}

function buildGeneratorPrompt(
  topic: Awaited<ReturnType<typeof fetchTopicDetails>>,
  prereqs: Awaited<ReturnType<typeof fetchPrerequisiteTopics>>,
  chunks: DocumentChunk[],
  format: ContentFormat,
  studentContext?: string,
): string {
  const objectives = topic.objectives.map((o) => `- ${o.name}: ${o.description}`).join("\n");
  const chunkText = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.source}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are an expert educational content generator. Generate ${format} content for the following topic.

TOPIC: ${topic.name}
MODULE: ${topic.module.name}
COURSE: ${topic.module.course.name}
DESCRIPTION: ${topic.description ?? "N/A"}

LEARNING OBJECTIVES:
${objectives}

PREREQUISITE TOPICS:
${prereqs.length > 0 ? prereqs.map((p) => `- ${p.name}: ${p.description ?? "N/A"}`).join("\n") : "None identified"}

SOURCE MATERIAL:
${chunkText || "No additional source material available. Base content on the topic description and objectives."}

${studentContext ? `STUDENT CONTEXT:\n${studentContext}\n` : ""}

FORMAT INSTRUCTIONS:
${buildFormatInstructions(format)}

CRITICAL RULES:
1. ALL content must cite the source material provided above.
2. Content must align with ALL listed learning objectives.
3. Do NOT introduce concepts outside the scope of this topic and its prerequisites.
4. Use clear, accessible language appropriate for the course level.
5. Every factual claim must be traceable to the source material or established knowledge within the syllabus.

Generate the content as JSON:`;
}

export async function generateContent(
  topicId: string,
  format: ContentFormat,
  studentId?: string,
): Promise<GeneratedContent> {
  logger.info("Generating content", { topicId, format, studentId: studentId ?? "none" });

  const [topic, prereqs, chunks] = await Promise.all([
    fetchTopicDetails(topicId),
    fetchPrerequisiteTopics(topicId),
    fetchRelatedChunks(topicId, topic.name),
  ]);

  let studentContext: string | undefined;
  if (studentId) {
    const mastery = await prisma.studentMastery.findFirst({
      where: { studentId, topicId },
    });
    if (mastery) {
      studentContext = `Student mastery score for this topic: ${mastery.masteryScore}. Adjust difficulty accordingly.`;
    }
  }

  const prompt = buildGeneratorPrompt(topic, prereqs, chunks, format, studentContext);
  const schema = FORMAT_SCHEMAS[format];

  let content: GeneratedContent;
  try {
    content = await generateJSON<GeneratedContent>(prompt, schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Content generation failed", { topicId, format, error: message });
    throw new Error(`Content generation failed: ${message}`);
  }

  logger.info("Content generated successfully", {
    topicId,
    format,
    citationCount: content.citations?.length ?? 0,
  });

  return content;
}
