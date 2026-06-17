/**
 * Graph + synthetic schedule — fully dynamic, works with any source files.
 * Run: npx tsx scripts/graph.ts
 */
import fs from "fs";
import path from "path";

const CHUNKS_FILE = path.resolve(__dirname, "../data/chunks.clean.json");
const CURR_FILE   = path.resolve(__dirname, "../data/curriculum.json");
const GRAPH_FILE  = path.resolve(__dirname, "../data/graph.json");

interface Chunk { id: number; source: string; section: string; content: string; page: number }
interface Topic { id: string; title: string; summary: string; objectives: string[]; sourceChunks: number[]; scheduledFor?: string }
interface Edge  { from: string; to: string; reason: string }

function addWorkdays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function humanLabel(source: string) {
  return source
    .replace(/^datalab-output-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\.pdf$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function run() {
  const chunks: Chunk[] = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));
  const curriculum = JSON.parse(fs.readFileSync(CURR_FILE, "utf-8"));
  const topics: Topic[] = curriculum.topics;

  // Build chunk→source map
  const chunkSource = new Map<number, string>();
  for (const c of chunks) chunkSource.set(c.id, c.source);

  // Group topic ids by source (preserving curriculum order)
  const sourceOrder: string[] = [];
  const topicsBySource = new Map<string, string[]>();
  for (const t of topics) {
    const src = chunkSource.get(t.sourceChunks[0] ?? -1) ?? "unknown";
    if (!topicsBySource.has(src)) { topicsBySource.set(src, []); sourceOrder.push(src); }
    topicsBySource.get(src)!.push(t.id);
  }

  const edges: Edge[] = [];

  // 1. Cross-source edges: last topic of source N → first topic of source N+1
  for (let i = 0; i < sourceOrder.length - 1; i++) {
    const fromIds = topicsBySource.get(sourceOrder[i])!;
    const toIds   = topicsBySource.get(sourceOrder[i + 1])!;
    if (!fromIds.length || !toIds.length) continue;
    edges.push({
      from: fromIds[fromIds.length - 1],
      to:   toIds[0],
      reason: `${humanLabel(sourceOrder[i])} is a prerequisite for ${humanLabel(sourceOrder[i + 1])}`,
    });
  }

  // 2. Within-source sequential edges
  for (const [src, ids] of topicsBySource) {
    for (let i = 0; i < ids.length - 1; i++) {
      const fromTopic = topics.find(t => t.id === ids[i]);
      const toTopic   = topics.find(t => t.id === ids[i + 1]);
      if (!fromTopic || !toTopic) continue;
      edges.push({
        from: ids[i],
        to:   ids[i + 1],
        reason: `"${toTopic.title}" builds on "${fromTopic.title}"`,
      });
    }
  }

  // 3. Assign dates — spread sources across next 2 weeks (weekdays only)
  const START = new Date("2026-06-18");
  const daysPerSource = Math.max(2, Math.floor(10 / Math.max(sourceOrder.length, 1)));

  for (let s = 0; s < sourceOrder.length; s++) {
    const ids = topicsBySource.get(sourceOrder[s]) ?? [];
    const sessionBase = addWorkdays(START, s * daysPerSource);
    ids.forEach((id, i) => {
      const topic = topics.find(t => t.id === id);
      if (!topic) return;
      topic.scheduledFor = toDateStr(addWorkdays(sessionBase, Math.floor(i / 3)));
    });
  }

  // Write outputs
  const graph = {
    note: "DEMO: prereq edges derived from source ordering.",
    edges,
  };
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
  console.log(`graph.json: ${edges.length} edges`);

  curriculum.topics = topics;
  fs.writeFileSync(CURR_FILE, JSON.stringify(curriculum, null, 2));
  console.log(`curriculum.json: ${topics.length} topics with dates`);

  console.log("\nSchedule:");
  for (const src of sourceOrder) {
    const ids = topicsBySource.get(src)!;
    const dates = ids.map(id => topics.find(t => t.id === id)?.scheduledFor).filter(Boolean);
    console.log(`  ${humanLabel(src)}: ${dates[0]} → ${dates[dates.length - 1]} (${ids.length} topics)`);
  }
}

run();
