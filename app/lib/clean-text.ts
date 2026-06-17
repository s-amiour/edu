/** Strip HTML tags, LaTeX, and noise from chunk content before sending to AI or displaying */
export function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")                        // strip HTML tags
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "")           // \command{...}
    .replace(/\\[a-zA-Z]+/g, "")                     // \Omega \mathbb etc
    .replace(/\$\$[\s\S]*?\$\$/g, "[formula]")       // display math $$...$$
    .replace(/\$[^$\n]+\$/g, "[formula]")            // inline math $...$
    .replace(/\[formula\]\s*(\[formula\]\s*)*/g, "[formula] ") // collapse
    .replace(/graph\s+[A-Z]{1,3}\s*;[\s\S]*?(?=\n\n|$)/g, "") // mermaid
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Parse multiple choice output into structured MCQ */
export function parseMultipleChoice(text: string): {
  question: string; options: string[]; correctIndex: number; explanation: string
} | null {
  const qMatch = text.match(/QUESTION:\s*(.+?)(?=\n[A-D][.):])/is);
  const opts = [...text.matchAll(/^([A-D])[.):\s]+(.+)/gm)].map(m => m[2].trim());
  const ansMatch = text.match(/ANSWER:\s*([A-D])/i);
  const expMatch = text.match(/EXPLANATION:\s*([\s\S]+?)$/i);
  if (!qMatch || opts.length < 2 || !ansMatch) return null;
  const correctIndex = "ABCD".indexOf(ansMatch[1].toUpperCase());
  return {
    question: qMatch[1].trim(),
    options: opts,
    correctIndex,
    explanation: expMatch?.[1].trim() ?? "",
  };
}

/** Parse flashcard-format text into Q/A pairs */
export function parseFlashcards(text: string): { q: string; a: string }[] {
  const cards: { q: string; a: string }[] = [];
  const blocks = text.split(/\n(?=Q:|Question:)/i);
  for (const block of blocks) {
    const qMatch = block.match(/^Q[^:]*:\s*(.+?)(?=\nA[^:]*:|$)/is);
    const aMatch = block.match(/A[^:]*:\s*([\s\S]+)/i);
    if (qMatch && aMatch) {
      cards.push({ q: qMatch[1].trim(), a: aMatch[1].trim() });
    }
  }
  return cards.length ? cards : [];
}
