import { NextRequest } from "next/server";
import { Resend } from "resend";
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

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return Response.json(
      { error: "Email sending is not configured (RESEND_API_KEY / FROM_EMAIL missing)." },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: detail.candidate.email,
      subject,
      text: emailBody,
    });

    if (error) {
      await updateEmailStatus(candidateId, "failed");
      return Response.json({ error: error.message }, { status: 502 });
    }

    await updateEmailStatus(candidateId, "sent");
    return Response.json({ success: true });
  } catch (err) {
    await updateEmailStatus(candidateId, "failed");
    const errMessage = err instanceof Error ? err.message : "Failed to send email";
    return Response.json({ error: errMessage }, { status: 502 });
  }
}
