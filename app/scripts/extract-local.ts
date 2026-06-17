/**
 * Rule-based extraction fallback — no API needed.
 * Groups chunks by (source, section), derives topics from real headings + content.
 * Output is identical schema to the Gemini extraction agent.
 */
import fs from "fs";
import path from "path";

const CHUNKS_FILE = path.resolve(__dirname, "../data/chunks.clean.json");
const OUT_FILE = path.resolve(__dirname, "../data/curriculum.json");

interface Chunk {
  id: number;
  source: string;
  section: string;
  content: string;
  page: number;
}

interface Topic {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  sourceChunks: number[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extractObjectives(chunks: Chunk[]): string[] {
  const objectivePatterns = [
    /by the end of this (session|module|lecture)[^.]*[:,]\s*([\s\S]*?)(?=\n\n|\d\s+[A-Z]|$)/i,
    /learning objectives?[^:]*:\s*([\s\S]*?)(?=\n\n|$)/i,
    /learners? will be able to[^:]*:\s*([\s\S]*?)(?=\n\n|$)/i,
  ];

  for (const chunk of chunks) {
    for (const pattern of objectivePatterns) {
      const match = chunk.content.match(pattern);
      if (match) {
        const raw = match[2] ?? match[1] ?? "";
        const objectives = raw
          .split(/\n|(?<=\d)\s+(?=[A-Z])/)
          .map((s) => s.replace(/^\d+\s*/, "").trim())
          .filter((s) => s.length > 15 && s.length < 200);
        if (objectives.length > 0) return objectives.slice(0, 6);
      }
    }
  }
  return [];
}

function deriveSummary(title: string, chunks: Chunk[]): string {
  // Take first 300 chars of first substantive chunk as basis
  const substantive = chunks.find((c) => c.content.length > 120);
  if (!substantive) return `Core concepts in ${title}.`;
  const snippet = substantive.content.slice(0, 300).replace(/\s+/g, " ").trim();
  // Return first sentence if it's long enough
  const firstSentence = snippet.split(/\.\s/)[0];
  return firstSentence.length > 40 ? firstSentence + "." : `Key material covering ${title}.`;
}

function run() {
  const chunks: Chunk[] = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));

  // Group by (source, section)
  const groups = new Map<string, { source: string; section: string; chunks: Chunk[] }>();
  for (const chunk of chunks) {
    const key = `${chunk.source}|||${chunk.section}`;
    if (!groups.has(key)) {
      groups.set(key, { source: chunk.source, section: chunk.section, chunks: [] });
    }
    groups.get(key)!.chunks.push(chunk);
  }

  const topics: Topic[] = [];
  const seenIds = new Set<string>();

  for (const { source, section, chunks: groupChunks } of groups.values()) {
    // Skip very small groups (likely noise)
    if (groupChunks.length < 2) continue;

    // Skip generic/unhelpful section names
    const genericSections = new Set([
      "unknown",
      "identity and access management fundamentals",
      "probabilities",
    ]);
    const sectionLower = section.toLowerCase();
    if (genericSections.has(sectionLower)) continue;

    const title = section
      .replace(/^\d+\s*[—–-]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    let id = slugify(`${source.split(".")[0]}-${title}`);
    // Ensure unique id
    let attempt = id;
    let n = 2;
    while (seenIds.has(attempt)) attempt = `${id}-${n++}`;
    id = attempt;
    seenIds.add(id);

    const objectives = extractObjectives(groupChunks);
    const summary = deriveSummary(title, groupChunks);

    topics.push({
      id,
      title,
      summary,
      objectives,
      sourceChunks: groupChunks.map((c) => c.id),
    });
  }

  const curriculum = {
    course: "Identity and Access Management Fundamentals",
    generatedAt: new Date().toISOString(),
    note: "DEMO: topics derived from lecture slide headings and content.",
    topics,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(curriculum, null, 2));
  console.log(`Written ${topics.length} topics → ${OUT_FILE}`);
  topics.forEach((t) =>
    console.log(`  [${t.sourceChunks.length} chunks] ${t.title}`)
  );
}

run();
