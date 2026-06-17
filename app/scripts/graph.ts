/**
 * M3 — Graph + synthetic schedule.
 * Derives prereq edges from session ordering, assigns scheduledFor dates.
 * Writes data/graph.json and updates data/curriculum.json with dates.
 * Run: npx tsx scripts/graph.ts
 */
import fs from "fs";
import path from "path";

const CHUNKS_FILE  = path.resolve(__dirname, "../data/chunks.clean.json");
const CURR_FILE    = path.resolve(__dirname, "../data/curriculum.json");
const GRAPH_FILE   = path.resolve(__dirname, "../data/graph.json");

interface Chunk  { id: number; source: string; section: string; content: string; page: number }
interface Topic  { id: string; title: string; summary: string; objectives: string[]; sourceChunks: number[]; scheduledFor?: string }
interface Edge   { from: string; to: string; reason: string }

// Canonical session order — determines prereq chain and schedule
const SESSION_ORDER: { source: string; label: string; daysFromStart: number }[] = [
  { source: "Counting.pdf",                                           label: "Counting & Enumeration",       daysFromStart: 0 },
  { source: "IAM Fundamentals-S1-Introduction to IAM V1.pdf",        label: "IAM S1: Intro",                daysFromStart: 2 },
  { source: "IAM Fundamentals-S2-Authentication Mechanisms 1.pdf",   label: "IAM S2: Authentication",       daysFromStart: 4 },
  { source: "IAM Fundamentals-S3 Authorization Models.pdf",          label: "IAM S3: Authorization",        daysFromStart: 5 },
  { source: "IAM-Fundamentals-Session-4-Identity Lifecycle Management.pdf", label: "IAM S4: Lifecycle",    daysFromStart: 7 },
  { source: "IAM-Fundamentals-Session-5-Federated Identity and SSO 1.pdf",  label: "IAM S5: Federated SSO",daysFromStart: 9 },
  { source: "IAM-Fundamentals-Session-6_Governance.pdf",             label: "IAM S6: Governance",           daysFromStart: 10 },
  { source: "Probability-Lecture_Notes-2425.pdf",                    label: "Probability",                  daysFromStart: 12 },
];

// Cross-session prereq reasons (from → to, humanised)
const SESSION_PREREQ_REASONS: Record<string, string> = {
  "Counting.pdf→IAM Fundamentals-S1-Introduction to IAM V1.pdf":
    "discrete counting underpins access control cardinality arguments",
  "IAM Fundamentals-S1-Introduction to IAM V1.pdf→IAM Fundamentals-S2-Authentication Mechanisms 1.pdf":
    "S2 assumes you understand what IAM is and why it matters",
  "IAM Fundamentals-S2-Authentication Mechanisms 1.pdf→IAM Fundamentals-S3 Authorization Models.pdf":
    "authorization only makes sense once authentication is established",
  "IAM Fundamentals-S3 Authorization Models.pdf→IAM-Fundamentals-Session-4-Identity Lifecycle Management.pdf":
    "lifecycle management applies the access models defined in S3",
  "IAM-Fundamentals-Session-4-Identity Lifecycle Management.pdf→IAM-Fundamentals-Session-5-Federated Identity and SSO 1.pdf":
    "federated identity extends the lifecycle concepts across org boundaries",
  "IAM-Fundamentals-Session-5-Federated Identity and SSO 1.pdf→IAM-Fundamentals-Session-6_Governance.pdf":
    "governance requires understanding the full IAM stack (S1–S5)",
  "Counting.pdf→Probability-Lecture_Notes-2425.pdf":
    "probability theory builds directly on combinatorics from Counting",
};

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

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function run() {
  const chunks: Chunk[] = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));
  const curriculum = JSON.parse(fs.readFileSync(CURR_FILE, "utf-8"));
  const topics: Topic[] = curriculum.topics;

  // Build chunk→source map
  const chunkSource = new Map<number, string>();
  for (const c of chunks) chunkSource.set(c.id, c.source);

  // Group topic ids by source (preserving order from curriculum)
  const topicsBySource = new Map<string, string[]>();
  for (const t of topics) {
    const src = chunkSource.get(t.sourceChunks[0] ?? -1) ?? "unknown";
    if (!topicsBySource.has(src)) topicsBySource.set(src, []);
    topicsBySource.get(src)!.push(t.id);
  }

  // --- Build edges ---
  const edges: Edge[] = [];

  // 1. Cross-session edges (first topic of next session depends on last of previous)
  for (let i = 0; i < SESSION_ORDER.length - 1; i++) {
    const fromSrc = SESSION_ORDER[i].source;
    const toSrc   = SESSION_ORDER[i + 1].source;
    const fromIds = topicsBySource.get(fromSrc) ?? [];
    const toIds   = topicsBySource.get(toSrc)   ?? [];
    if (!fromIds.length || !toIds.length) continue;

    const reason = SESSION_PREREQ_REASONS[`${fromSrc}→${toSrc}`] ??
      `${SESSION_ORDER[i].label} is a prerequisite for ${SESSION_ORDER[i + 1].label}`;

    // Last topic of from-session → first topic of to-session
    edges.push({ from: fromIds[fromIds.length - 1], to: toIds[0], reason });
  }

  // 2. Within-session sequential edges (each topic depends on the previous)
  for (const [src, ids] of topicsBySource) {
    const session = SESSION_ORDER.find((s) => s.source === src);
    const label = session?.label ?? src;
    for (let i = 0; i < ids.length - 1; i++) {
      const fromTopic = topics.find((t) => t.id === ids[i]);
      const toTopic   = topics.find((t) => t.id === ids[i + 1]);
      if (!fromTopic || !toTopic) continue;
      edges.push({
        from: ids[i],
        to:   ids[i + 1],
        reason: `"${toTopic.title}" builds on "${fromTopic.title}" in ${label}`,
      });
    }
  }

  // --- Assign scheduledFor dates ---
  const START = new Date("2026-06-18"); // tomorrow

  for (const session of SESSION_ORDER) {
    const ids = topicsBySource.get(session.source) ?? [];
    const sessionBase = addWorkdays(START, session.daysFromStart);

    ids.forEach((id, i) => {
      const topic = topics.find((t) => t.id === id);
      if (!topic) return;
      // Stagger topics within a session by 0–1 extra days
      const dayOffset = Math.floor(i / 4); // group 4 topics per day
      const date = addWorkdays(sessionBase, dayOffset);
      topic.scheduledFor = toDateStr(date);
    });
  }

  // --- Write outputs ---
  const graph = {
    note: "DEMO: prereq edges derived from session ordering — not assessed by an instructor.",
    edges,
  };
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
  console.log(`graph.json: ${edges.length} edges`);

  curriculum.topics = topics;
  fs.writeFileSync(CURR_FILE, JSON.stringify(curriculum, null, 2));
  console.log(`curriculum.json: ${topics.length} topics with scheduledFor dates`);

  // Summary
  console.log("\nSession schedule:");
  for (const s of SESSION_ORDER) {
    const ids = topicsBySource.get(s.source) ?? [];
    const dates = ids.map((id) => topics.find((t) => t.id === id)?.scheduledFor).filter(Boolean);
    const first = dates[0] ?? "?";
    const last  = dates[dates.length - 1] ?? "?";
    console.log(`  ${s.label}: ${first} → ${last} (${ids.length} topics)`);
  }
}

run();
