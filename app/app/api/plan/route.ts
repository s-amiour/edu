import { NextRequest } from "next/server";
import { planNext } from "@/lib/agents/plan";

export async function POST(req: NextRequest) {
  const { mastery } = await req.json();
  const result = await planNext(mastery ?? {});
  return Response.json(result);
}
