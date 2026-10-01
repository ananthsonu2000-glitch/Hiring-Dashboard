import { NextRequest } from "next/server";
import { sendEmail, EmailConfigError } from "@/lib/email";
import { getCandidateDetail, updateEmailDraft, updateEmailStatus } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const candidateId = body?.candidateId as string | undefined;
  const subject = body?.subject as string | undefined;
  const emailBody = body?.body as string | undefined;

  if (!candidateId || !subject?.trim() || !emailBody?.trim()) {
    return Response.json(
      { error: "candidateId, subject, and body are required" },
      { status: 400 }
    );
  }

  const detail = await getCandidateDetail(candidateId);
  if (!detail) {
    return Response.json({ error: "Candidate not found" }, { status: 404 });
  }
  if (!detail.candidate.email) {
    return Response.json(
      { error: "This candidate has no email address on file — cannot send." },
      { status: 400 }
    );
  }

  // Persist any founder edits made just before sending.
  await updateEmailDraft(candidateId, subject, emailBody);

  try {
    await sendEmail({ to: detail.candidate.email, subject, text: emailBody });
    await updateEmailStatus(candidateId, "sent");
    return Response.json({ success: true });
  } catch (err) {
    await updateEmailStatus(candidateId, "failed");
    const status = err instanceof EmailConfigError ? 500 : 502;
    const errMessage = err instanceof Error ? err.message : "Failed to send email";
    return Response.json({ error: errMessage }, { status });
  }
}
