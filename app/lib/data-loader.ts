import fs from "fs";
import path from "path";

export interface Topic {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  sourceChunks: number[];
  scheduledFor?: string;
}

export interface Chunk {
  id: number;
  source: string;
  section: string;
  content: string;
  page: number;
}

export interface Curriculum {
  course: string;
  topics: Topic[];
}

function loadJSON<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf-8"));
}

const curriculum: Curriculum = loadJSON("data/curriculum.json");
const chunks: Chunk[] = loadJSON("data/chunks.clean.json");
const chunkMap = new Map(chunks.map(c => [c.id, c]));

export default curriculum;
export { chunks, chunkMap };
