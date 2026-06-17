import { generateJSON } from "./gemini-client.js";
import { generateContent } from "./generator.js";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";

type ContentFormat = "summary" | "flashcards" | "worked_example" | "analogy" | "quiz";

interface ValidationResult {
  valid: boolean;
  issues: string[];
  score: number;
}

interface GeneratedContent {
  format: ContentFormat;
  topicId: string;
  content: unknown;
  citations: string[];
}

const MAX_REGENERATION_RETRIES = 2;

const CRITIC_SCHEMA = `{
  "valid": boolean,
  "issues": ["string (each issue found)"],
  "score": number (0-100)
}`;

async function fetchTopicForValidation(topicId: string) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      objectives: true,
      module: { include: { course: true } },
    },
  });

  if (!topic) {
    throw new Error(`Topic not found for validation: ${topicId}`);
  }

  return topic;
}

function buildCriticPrompt(
  content: GeneratedContent,
  topic: Awaited<ReturnType<typeof fetchTopicForValidation>>,
): string {
  const objectives = topic.objectives.map((o) => `- ${o.name}: ${o.description}`).join("\n");

  return `You are an expert educational content reviewer. Validate the following generated content against the topic requirements.

TOPIC: ${topic.name}
MODULE: ${topic.module.name}
COURSE: ${topic.module.course.name}
FORMAT: ${content.format}

LEARNING OBJECTIVES:
${objectives}

GENERATED CONTENT:
${JSON.stringify(content.content, null, 2)}

CITATIONS PROVIDED:
${content.citations?.join(", ") ?? "None"}

VALIDATION CRITERIA:
1. FACTUAL CORRECTNESS: Are all facts, definitions, and claims accurate? Flag any errors or misleading statements.
2. SYLLABUS ALIGNMENT: Does the content stay within the scope of this topic and course? Flag any out-of-scope material.
3. OBJECTIVE ALIGNMENT: Does the content address ALL listed learning objectives? List any objectives not covered.
4. CLARITY AND APPROPRIATENESS: Is the language clear and appropriate for the course level? Is the content well-organized?
5. CITATION INTEGRITY: Do the citations reference real source material? Are claims properly attributed?

SCORING:
- 90-100: Excellent, no significant issues
- 70-89: Good, minor issues that don't impede learning
- 50-69: Acceptable, notable issues but core content is sound
- Below 50: Poor, significant issues requiring regeneration

Mark as valid (true) if score >= 70 and no factual errors exist.

Return your assessment as JSON:`;
}

export async function validateContent(
  content: GeneratedContent,
  topicId: string,
  _format: ContentFormat,
): Promise<ValidationResult> {
  logger.info("Validating content", { topicId, format: content.format });

  const topic = await fetchTopicForValidation(topicId);
  const prompt = buildCriticPrompt(content, topic);

  let result: ValidationResult;
  try {
    result = await generateJSON<ValidationResult>(prompt, CRITIC_SCHEMA);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Content validation failed", { topicId, error: message });
    return { valid: false, issues: [`Validation error: ${message}`], score: 0 };
  }

  logger.info("Content validation complete", {
    topicId,
    valid: result.valid,
    score: result.score,
    issueCount: result.issues?.length ?? 0,
  });

  return result;
}

export async function generateWithValidation(
  topicId: string,
  format: ContentFormat,
  studentId?: string,
): Promise<GeneratedContent> {
  logger.info("Starting generate-with-validation pipeline", { topicId, format });

  let content = await generateContent(topicId, format, studentId);
  let validation = await validateContent(content, topicId, format);

  let retries = 0;

  while (!validation.valid && retries < MAX_REGENERATION_RETRIES) {
    retries++;
    logger.warn("Content failed validation, regenerating", {
      topicId,
      format,
      retry: retries,
      score: validation.score,
      issues: validation.issues,
    });

    content = await generateContent(topicId, format, studentId);
    validation = await validateContent(content, topicId, format);
  }

  if (!validation.valid) {
    logger.error("Content failed validation after all retries", {
      topicId,
      format,
      finalScore: validation.score,
      totalRetries: retries,
    });
  }

  logger.info("Generate-with-validation pipeline complete", {
    topicId,
    format,
    valid: validation.valid,
    score: validation.score,
    retries,
  });

  return content;
}
