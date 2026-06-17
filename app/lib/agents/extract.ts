import Groq from "groq-sdk";

function getClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export interface RawTopic {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  sourceChunks: number[];
}

interface ChunkInput {
  id: number;
  section: string;
  content: string;
  page: number;
}

const SYSTEM = `You are a curriculum analyst. Given lecture slide chunks from a single course session, extract a structured list of topics.

Output ONLY valid JSON — no markdown, no commentary, no code fences. The JSON must be an array of topic objects with exactly these fields:
{
  "id": "kebab-case-slug",
  "title": "Short human title (3-6 words)",
  "summary": "One sentence: what this topic is and why it matters.",
  "objectives": ["Verb-led learning objective", ...],
  "sourceChunks": [array of chunk id integers]
}

Rules:
- Group related chunks into coherent topics — aim for 3-8 topics per session.
- Extract objectives ONLY from text that explicitly lists them ("By the end", "learners will", numbered outcome lists).
- If no explicit objectives found, write 1-2 inferred ones from the content.
- sourceChunks must be the exact integer id values from the input.
- ids must be unique kebab-case slugs.`;

export async function extractTopics(
  chunks: ChunkInput[],
  sessionLabel: string
): Promise<RawTopic[]> {
  const sampled = sampleChunks(chunks, 20);

  const chunkText = sampled
    .map((c) => `[id:${c.id}] [section:${c.section}] [page:${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  const userMsg = `Session: ${sessionLabel}\n\nChunks (${sampled.length} of ${chunks.length}):\n\n${chunkText}\n\nExtract topics as JSON array.`;

  const response = await getClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return parseTopics(raw, sessionLabel);
}

function sampleChunks(chunks: ChunkInput[], maxCount: number): ChunkInput[] {
  if (chunks.length <= maxCount) return chunks;
  const step = Math.floor(chunks.length / maxCount);
  const result: ChunkInput[] = [];
  for (let i = 0; i < chunks.length; i += step) {
    result.push(chunks[i]);
    if (result.length >= maxCount) break;
  }
  return result;
}

function parseTopics(raw: string, sessionLabel: string): RawTopic[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.filter(isValidTopic);
  } catch (e) {
    console.error(`[extract] JSON parse failed for "${sessionLabel}":`, e);
    console.error("[extract] Raw:", raw.slice(0, 400));
    return [];
  }
}

function isValidTopic(t: unknown): t is RawTopic {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.summary === "string" &&
    Array.isArray(o.objectives) &&
    Array.isArray(o.sourceChunks)
  );
}
