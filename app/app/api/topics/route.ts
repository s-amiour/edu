import curriculum from "@/lib/data-loader";
export async function GET() {
  return Response.json(curriculum.topics.map(t => ({
    id: t.id, title: t.title, scheduledFor: t.scheduledFor
  })));
}
