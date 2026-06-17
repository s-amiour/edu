/**
 * M1 — Data prep script.
 * Reads DATA/sanitized/*.chunks.json, dedupes + strips noise, writes data/chunks.clean.json.
 * Run: npx tsx scripts/prep.ts
 */
import fs from "fs";
import path from "path";

const SANITIZED_DIR = path.resolve(__dirname, "../../DATA/sanitized");
const OUT_FILE = path.resolve(__dirname, "../data/chunks.clean.json");

// --- noise filters ---

const MERMAID_RE = /^graph\s+(TD|LR|TB|BT|RL)\b/i;

const IMAGE_DESC_RE =
  /^(A|An|The)\s+(glowing|stylized|decorative|diagram|graphic|photograph|chart|illustration|icon|image|screenshot|logo|banner|slide|figure|photo|drawing|picture|visual|render|rendering|depicted|shown)\b/i;

/** Returns true if a sentence looks like image alt-text / diagram code. */
function isNoiseSentence(s: string): boolean {
  return MERMAID_RE.test(s) || IMAGE_DESC_RE.test(s);
}

/**
 * Strips noise sentences from content.
 * Splits on ". " boundaries, drops noise lines, rejoins.
 * Returns null if nothing meaningful remains.
 */
function cleanContent(raw: string): string | null {
  const sentences = raw
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clean = sentences.filter((s) => !isNoiseSentence(s));
  if (clean.length === 0) return null;

  const result = clean.join(" ").trim();
  return result.length > 80 ? result : null;
}

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// --- main ---

interface RawChunk {
  section: string;
  content: string;
  page: number;
}

export interface CleanChunk {
  id: number;
  source: string;   // filename stem (e.g. "IAM-Governance")
  section: string;
  content: string;
  page: number;
}

function run() {
  const files = fs
    .readdirSync(SANITIZED_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(`Found ${files.length} source files.\n`);

  const seen = new Set<string>();
  const result: CleanChunk[] = [];

  let totalRaw = 0;
  let totalDupDrop = 0;
  let totalNoiseDrop = 0;

  for (const filename of files) {
    const raw: RawChunk[] = JSON.parse(
      fs.readFileSync(path.join(SANITIZED_DIR, filename), "utf-8")
    );
    const source = filename.replace(/\.chunks\.json$/, "").replace(/^datalab-output-/, "");

    let dupDrop = 0;
    let noiseDrop = 0;
    let kept = 0;

    for (const chunk of raw) {
      totalRaw++;

      // Exact-dup check
      const key = normalizeKey(chunk.content);
      if (seen.has(key)) {
        dupDrop++;
        totalDupDrop++;
        continue;
      }
      seen.add(key);

      // Noise cleaning
      const cleaned = cleanContent(chunk.content);
      if (!cleaned) {
        noiseDrop++;
        totalNoiseDrop++;
        continue;
      }

      result.push({
        id: result.length,
        source,
        section: chunk.section,
        content: cleaned,
        page: chunk.page,
      });
      kept++;
    }

    console.log(
      `  ${filename}\n    raw=${raw.length}  dup_drop=${dupDrop}  noise_drop=${noiseDrop}  kept=${kept}`
    );
  }

  console.log(`
=== Summary ===
Total raw:        ${totalRaw}
Dup dropped:      ${totalDupDrop}
Noise dropped:    ${totalNoiseDrop}
Clean chunks:     ${result.length}
`);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Written → ${OUT_FILE}`);
}

run();
