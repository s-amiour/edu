import Groq from "groq-sdk";
import curriculum from "../data-loader";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type Format = "summary" | "flashcards" | "worked_example" | "analogy" | "practice_problem" | "multiple_choice";
export interface PlanResult { topicId: string; format: Format; reason: string }

export async function planNext(mastery: Record<string, string>): Promise<PlanResult> {
  const { topics } = curriculum;
  const today = new Date().toISOString().slice(0, 10);

  const topicList = topics.map(t => ({
    id: t.id,
    title: t.title,
    scheduledFor: t.scheduledFor,
    mastery: mastery[t.id] ?? "unseen",
    objectives: t.objectives.slice(0, 2),
  }));

  const prompt = `Today is ${today}. You are an adaptive study planner.

Topics (id | title | scheduled | mastery):
${topicList.map(t => `${t.id} | ${t.title} | ${t.scheduledFor} | ${t.mastery}`).join("\n")}

Pick the SINGLE most valuable topic to study right now. Prefer:
- Topics scheduled soon with mastery "unseen" or "seen"
- Topics whose prereqs are not yet "practiced" or "confident" (gap detection)
- Avoid "confident" topics

Also pick a format: summary | flashcards | worked_example | analogy | practice_problem

Respond with ONLY valid JSON (no markdown):
{"topicId":"...","format":"...","reason":"One student-facing sentence explaining why this topic now."}`;

  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 256,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fallback: pick first unseen topic
    const unseen = topics.find(t => (mastery[t.id] ?? "unseen") === "unseen");
    return { topicId: unseen?.id ?? topics[0].id, format: "summary", reason: "Starting from the beginning." };
  }
}
