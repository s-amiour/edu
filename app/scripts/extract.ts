/**
 * M2 — Extraction agent runner.
 * Reads data/chunks.clean.json, calls extract agent per source file,
 * writes data/curriculum.json.
 * Run: npx tsx scripts/extract.ts
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import fs from "fs";
import path from "path";
import { extractTopics, RawTopic } from "../lib/agents/extract";

const CHUNKS_FILE = path.resolve(__dirname, "../data/chunks.clean.json");
const OUT_FILE = path.resolve(__dirname, "../data/curriculum.json");

interface Chunk {
  id: number;
  source: string;
  section: string;
  content: string;
  page: number;
}

interface Topic extends RawTopic {
  scheduledFor?: string; // added in M3
}

interface Curriculum {
  course: string;
  generatedAt: string;
  topics: Topic[];
}

async function main() {
  const chunks: Chunk[] = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));

  // Group by source file
  const bySource = new Map<string, Chunk[]>();
  for (const chunk of chunks) {
    if (!bySource.has(chunk.source)) bySource.set(chunk.source, []);
    bySource.get(chunk.source)!.push(chunk);
  }

  console.log(`Processing ${bySource.size} source files...\n`);

  const allTopics: Topic[] = [];
  const seenIds = new Set<string>();

  for (const [source, sourceChunks] of bySource) {
    console.log(`→ ${source} (${sourceChunks.length} chunks)`);
    try {
      const topics = await extractTopics(sourceChunks, source);

      // Dedupe ids across sources (suffix with source index if collision)
      for (const topic of topics) {
        let id = topic.id;
        if (seenIds.has(id)) {
          id = `${id}-${allTopics.length}`;
          topic.id = id;
        }
        seenIds.add(id);
        allTopics.push(topic);
      }

      console.log(`  ✓ ${topics.length} topics: ${topics.map((t) => t.title).join(", ")}\n`);
    } catch (err) {
      console.error(`  ✗ Failed for ${source}:`, err);
    }
  }

  const curriculum: Curriculum = {
    course: "Identity and Access Management Fundamentals",
    generatedAt: new Date().toISOString(),
    topics: allTopics,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(curriculum, null, 2));
  console.log(`\nWritten ${allTopics.length} topics → ${OUT_FILE}`);
}

main().catch(console.error);
