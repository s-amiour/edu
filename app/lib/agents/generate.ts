import Groq from "groq-sdk";
import { chunkMap } from "../data-loader";
import { cleanText } from "../clean-text";
import type { Format } from "./plan";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface CardResult {
  content: string;
  criticPassed: boolean;
  issues?: string[];
}

const FORMAT_INSTRUCTIONS: Record<Format, string> = {
  summary: "Write exactly 3 bullet points (•) summarising the key ideas. Each bullet: one clear sentence. No intro, no outro.",
  flashcards: "Write exactly 3 flashcards.\nFormat each as:\nQ: [question]\nA: [answer]\nKeep each answer to one sentence.",
  worked_example: "Give ONE short worked example (4-6 lines). Label: Example: then Solution:",
  analogy: "Explain the concept with ONE real-world analogy in 2-3 sentences. Start with 'Think of...'",
  practice_problem: "Write ONE short practice problem, then the answer on a new line starting 'Answer:'",
  multiple_choice: `Write ONE multiple choice question with 4 options and an explanation.
Use EXACTLY this format (no deviations):
QUESTION: [the question]
A) [option]
B) [option]
C) [option]
D) [option]
ANSWER: [A/B/C/D]
EXPLANATION: [one sentence explaining why]`,
};

export async function generateCard(
  topicId: string,
  title: string,
  objectives: string[],
  sourceChunkIds: number[],
  format: Format
): Promise<CardResult> {
  // Clean source text — strip LaTeX, HTML, mermaid before sending to AI
  const sourceText = sourceChunkIds
    .slice(0, 6)
    .map(id => cleanText(chunkMap.get(id)?.content ?? ""))
    .filter(s => s.length > 40)
    .join("\n\n")
    .slice(0, 2000);

  const genPrompt = `You are a concise study card generator. Use ONLY the source material.
Do NOT include LaTeX, HTML tags, or technical markup. Write plain readable English.

Topic: ${title}
Objective: ${objectives[0] ?? "understand the core concepts"}

FORMAT: ${FORMAT_INSTRUCTIONS[format]}

SOURCE:
${sourceText}

Output only the card content — no preamble, no "Here is your card".`;

  const genRes = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: genPrompt }],
    temperature: 0.3,
    max_tokens: 350,
  });
  const draft = cleanText(genRes.choices[0]?.message?.content ?? "");

  // Critic — lightweight check
  const criticPrompt = `Does this study card accurately reflect the source? No hallucinations?

SOURCE (excerpt): ${sourceText.slice(0, 800)}

CARD: ${draft}

Reply ONLY with JSON: {"ok":true} or {"ok":false,"issues":["..."],"fixed":"corrected text"}`;

  const criticRes = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: criticPrompt }],
    temperature: 0.1,
    max_tokens: 400,
  });

  const criticRaw = criticRes.choices[0]?.message?.content ?? "";
  const criticCleaned = criticRaw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();

  try {
    const critic = JSON.parse(criticCleaned);
    if (!critic.ok && critic.fixed) {
      return { content: cleanText(critic.fixed), criticPassed: false, issues: critic.issues };
    }
  } catch { /* use draft */ }

  return { content: draft, criticPassed: true };
}
