import { NextRequest } from "next/server";
import { generateCard } from "@/lib/agents/generate";
import curriculum from "@/lib/data-loader";

export async function POST(req: NextRequest) {
  const { topicId, format } = await req.json();
  const topic = curriculum.topics.find(t => t.id === topicId);
  if (!topic) return Response.json({ error: "topic not found" }, { status: 404 });

  const card = await generateCard(
    topic.id,
    topic.title,
    topic.objectives,
    topic.sourceChunks,
    format
  );
  return Response.json({ ...card, topic });
}
