import fs from "fs";
import path from "path";
export async function GET() {
  const graph = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data/graph.json"), "utf-8"));
  return Response.json(graph);
}
