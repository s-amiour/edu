import { GoogleGenAI } from "@google/genai";

function getClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export interface RawTopic {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  sourceChunks: number[]; // indices into chunks.clean.json
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
- Group related chunks into coherent topics (not one topic per chunk — aim for 3-8 topics per session).
- Extract objectives ONLY from text that explicitly lists them (look for "By the end", "learners will", "objectives", numbered lists of outcomes).
- If no explicit objectives found, write 1-2 inferred ones based on content — keep them concise.
- sourceChunks must reference the exact integer "id" values from the input chunks.
- Keep ids unique and in kebab-case (e.g. "iam-governance-basics").`;

export async function extractTopics(
  chunks: ChunkInput[],
  sessionLabel: string
): Promise<RawTopic[]> {
  const sampled = sampleChunks(chunks, 120);

  const chunkText = sampled
    .map((c) => `[id:${c.id}] [section:${c.section}] [page:${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  const prompt = `${SYSTEM}\n\nSession: ${sessionLabel}\n\nChunks (${sampled.length} of ${chunks.length}):\n\n${chunkText}\n\nExtract topics as JSON array.`;

  const response = await getClient().models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const raw = response.text ?? "";
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
    console.error("[extract] Raw response:", raw.slice(0, 500));
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
