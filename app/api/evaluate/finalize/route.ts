import { NextRequest } from "next/server";
import { rerankEvaluation } from "@/lib/db";

export const runtime = "nodejs";

/** Called once after the upload form has finished POSTing every resume for a batch. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const evaluationId = body?.evaluationId as string | undefined;

  if (!evaluationId) {
    return Response.json({ error: "evaluationId is required" }, { status: 400 });
  }

  await rerankEvaluation(evaluationId);
  return Response.json({ success: true });
}
