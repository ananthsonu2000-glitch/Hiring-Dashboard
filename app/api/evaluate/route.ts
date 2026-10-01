import { NextRequest } from "next/server";
import { extractResumeText, ResumeParseError, detectFileType } from "@/lib/resume-text";
import { extractCandidateData } from "@/lib/gemini/extract";
import { classifyRole } from "@/lib/gemini/classify-role";
import { scoreCandidate } from "@/lib/gemini/score";
import { generateInterviewBrief } from "@/lib/gemini/brief";
import { generateEmail } from "@/lib/gemini/email";
import { GeminiError } from "@/lib/gemini/client";
import { computeTotals } from "@/lib/scoring";
import {
  createEvaluation,
  findDuplicateInEvaluation,
  insertCandidate,
  insertCandidateOutputs,
  insertCandidateScores,
  recordCandidateError,
  rerankEvaluation,
  uploadResume,
} from "@/lib/db";
import type { EvaluateProgressEvent, RoleSelection } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 50;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const COMPANY_NAME = process.env.COMPANY_NAME || "Kargo";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const roleSelection = formData.get("role") as RoleSelection | null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (roleSelection !== "PM" && roleSelection !== "SPM" && roleSelection !== "AUTO") {
    return Response.json({ error: "role must be PM, SPM, or AUTO" }, { status: 400 });
  }
  if (files.length === 0) {
    return Response.json({ error: "No files uploaded" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json({ error: `Upload at most ${MAX_FILES} resumes at a time` }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: EvaluateProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      let evaluationId: string;
      try {
        evaluationId = await createEvaluation(roleSelection === "AUTO" ? null : roleSelection);
      } catch (err) {
        send({
          type: "candidate_error",
          filename: "(all files)",
          error: `Could not start evaluation: ${message(err)}`,
        });
        controller.close();
        return;
      }

      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = file.name;
        send({ type: "start", filename, index: i, total: files.length });

        let role: "PM" | "SPM" | null = roleSelection === "AUTO" ? null : roleSelection;

        try {
          if (!detectFileType(filename)) {
            throw new ResumeParseError("Unsupported file type. Upload a .pdf, .docx, or .txt resume.");
          }
          if (file.size === 0) throw new ResumeParseError("Uploaded file is empty.");
          if (file.size > MAX_FILE_BYTES) throw new ResumeParseError("File is too large (max 15MB).");

          const buffer = Buffer.from(await file.arrayBuffer());

          send({ type: "step", filename, step: "Reading CV..." });
          const resumeText = await extractResumeText(buffer, filename);

          send({ type: "step", filename, step: "Extracting candidate details..." });
          const extracted = await extractCandidateData(resumeText);

          const isDuplicate = await findDuplicateInEvaluation(evaluationId, extracted.email);
          if (isDuplicate) {
            send({
              type: "duplicate",
              filename,
              message: `A candidate with email "${extracted.email}" was already processed in this batch — skipped.`,
            });
            continue;
          }

          let roleMatch: { reasoning: string; confidence: "High" | "Medium" | "Low" } | null = null;
          if (roleSelection === "AUTO") {
            send({ type: "step", filename, step: "Determining best-fit role (PM or SPM)..." });
            const match = await classifyRole(extracted);
            role = match.role;
            roleMatch = { reasoning: match.reasoning, confidence: match.confidence };
            send({ type: "role_determined", filename, roleMatch: match });
          } else {
            role = roleSelection;
          }

          send({ type: "step", filename, step: `Scoring against ${role} rubric...` });
          const scoring = await scoreCandidate(extracted, role);
          const totals = computeTotals(scoring.scores);

          send({ type: "step", filename, step: "Generating interview brief..." });
          const brief = await generateInterviewBrief(extracted, scoring, totals.recommendation);

          send({ type: "step", filename, step: "Drafting candidate email..." });
          const email = await generateEmail(extracted, role, totals.recommendation, COMPANY_NAME);

          send({ type: "step", filename, step: "Saving results..." });
          const resumeUrl = await uploadResume(evaluationId, filename, buffer);

          const candidate = await insertCandidate({
            evaluationId,
            role,
            resumeFilename: filename,
            resumeUrl,
            extracted,
            totals,
            strongest_evidence: scoring.strongest_evidence,
            key_strengths: scoring.key_strengths,
            key_gaps: scoring.key_gaps,
            missing_information: scoring.missing_information,
            risks_concerns: scoring.risks_concerns,
            pre_screen_notes: scoring.pre_screen_notes,
            roleMatch,
          });

          await insertCandidateScores(candidate.id, scoring.scores);
          await insertCandidateOutputs({
            candidateId: candidate.id,
            interviewBrief: brief,
            emailSubject: email.subject,
            emailBody: email.body,
          });

          successCount++;
          send({ type: "candidate_done", filename, candidate });
        } catch (err) {
          const errMessage =
            err instanceof ResumeParseError || err instanceof GeminiError
              ? err.message
              : `Unexpected error: ${message(err)}`;

          try {
            await recordCandidateError({ evaluationId, role, resumeFilename: filename, error: errMessage });
          } catch {
            // best-effort logging; continue regardless
          }

          send({ type: "candidate_error", filename, error: errMessage });
        }
      }

      if (successCount > 0) {
        await rerankEvaluation(evaluationId);
      }

      send({ type: "all_done", evaluationId, count: successCount });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
