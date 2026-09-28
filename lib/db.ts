import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  CandidateOutputRecord,
  CandidateRecord,
  CandidateScoreRecord,
  EmailStatus,
  InterviewBrief,
  Recommendation,
  Role,
  ScoreCriterion,
  StructuredCandidate,
} from "@/types";

export async function createEvaluation(role: Role): Promise<string> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("evaluations")
    .insert({ role })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create evaluation: ${error?.message}`);
  return data.id as string;
}

export async function uploadResume(
  evaluationId: string,
  filename: string,
  buffer: Buffer
): Promise<string | null> {
  const db = getSupabaseAdmin();
  const path = `${evaluationId}/${Date.now()}-${filename}`;
  const { error } = await db.storage
    .from("resumes")
    .upload(path, buffer, { contentType: "application/pdf" });

  if (error) {
    console.error("Resume upload failed:", error.message);
    return null;
  }

  const { data } = await db.storage
    .from("resumes")
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  return data?.signedUrl ?? null;
}

export async function findDuplicateInEvaluation(
  evaluationId: string,
  email: string | null
): Promise<boolean> {
  if (!email) return false;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("candidates")
    .select("id")
    .eq("evaluation_id", evaluationId)
    .ilike("email", email)
    .limit(1);

  return Boolean(data && data.length > 0);
}

export async function insertCandidate(params: {
  evaluationId: string;
  role: Role;
  resumeFilename: string;
  resumeUrl: string | null;
  extracted: StructuredCandidate;
  totals: {
    total_score: number;
    max_score: number;
    percentage: number;
    recommendation: Recommendation;
  };
  strongest_evidence: string[];
  key_strengths: string[];
  key_gaps: string[];
  missing_information: string[];
  risks_concerns: string[];
  pre_screen_notes: string;
}): Promise<CandidateRecord> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("candidates")
    .insert({
      evaluation_id: params.evaluationId,
      name: params.extracted.name,
      email: params.extracted.email,
      phone: params.extracted.phone,
      current_title: params.extracted.current_role,
      current_company: params.extracted.current_company,
      resume_filename: params.resumeFilename,
      resume_url: params.resumeUrl,
      role_evaluated: params.role,
      extracted_data: params.extracted,
      total_experience_years: params.extracted.total_experience_years,
      total_score: params.totals.total_score,
      max_score: params.totals.max_score,
      percentage: params.totals.percentage,
      recommendation: params.totals.recommendation,
      strongest_evidence: params.strongest_evidence,
      key_strengths: params.key_strengths,
      key_gaps: params.key_gaps,
      missing_information: params.missing_information,
      risks_concerns: params.risks_concerns,
      pre_screen_notes: params.pre_screen_notes,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to save candidate: ${error?.message}`);
  return data as CandidateRecord;
}

export async function insertCandidateScores(
  candidateId: string,
  scores: ScoreCriterion[]
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("candidate_scores").insert(
    scores.map((s) => ({
      candidate_id: candidateId,
      criterion: s.criterion,
      max_score: s.max_score,
      score: s.score,
      evidence: s.evidence,
      reasoning: s.reasoning,
      confidence: s.confidence,
    }))
  );
  if (error) throw new Error(`Failed to save scores: ${error.message}`);
}

export async function insertCandidateOutputs(params: {
  candidateId: string;
  interviewBrief: InterviewBrief;
  emailSubject: string;
  emailBody: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("candidate_outputs").insert({
    candidate_id: params.candidateId,
    interview_brief: params.interviewBrief,
    email_subject: params.emailSubject,
    email_body: params.emailBody,
    email_status: "draft",
  });
  if (error) throw new Error(`Failed to save outputs: ${error.message}`);
}

export async function recordCandidateError(params: {
  evaluationId: string;
  role: Role;
  resumeFilename: string;
  error: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("candidates").insert({
    evaluation_id: params.evaluationId,
    resume_filename: params.resumeFilename,
    role_evaluated: params.role,
    extracted_data: {},
    processing_error: params.error,
    recommendation: null,
  });
}

export async function rerankEvaluation(evaluationId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("candidates")
    .select("id, percentage")
    .eq("evaluation_id", evaluationId)
    .is("processing_error", null)
    .order("percentage", { ascending: false });

  if (error || !data) return;

  await Promise.all(
    data.map((row, i) =>
      db.from("candidates").update({ rank: i + 1 }).eq("id", row.id)
    )
  );
}

export async function getDashboardCandidates(): Promise<CandidateRecord[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .is("processing_error", null)
    .order("percentage", { ascending: false });

  if (error) throw new Error(`Failed to load candidates: ${error.message}`);
  return (data ?? []) as CandidateRecord[];
}

export async function getCandidateDetail(id: string): Promise<{
  candidate: CandidateRecord;
  scores: CandidateScoreRecord[];
  outputs: CandidateOutputRecord | null;
} | null> {
  const db = getSupabaseAdmin();

  const { data: candidate } = await db
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (!candidate) return null;

  const { data: scores } = await db
    .from("candidate_scores")
    .select("*")
    .eq("candidate_id", id);

  const { data: outputs } = await db
    .from("candidate_outputs")
    .select("*")
    .eq("candidate_id", id)
    .maybeSingle();

  return {
    candidate: candidate as CandidateRecord,
    scores: (scores ?? []) as CandidateScoreRecord[],
    outputs: outputs as CandidateOutputRecord | null,
  };
}

export async function updateEmailDraft(
  candidateId: string,
  subject: string,
  body: string
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("candidate_outputs")
    .update({ email_subject: subject, email_body: body })
    .eq("candidate_id", candidateId);
  if (error) throw new Error(`Failed to update email draft: ${error.message}`);
}

export async function updateEmailStatus(
  candidateId: string,
  status: EmailStatus
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("candidate_outputs")
    .update({
      email_status: status,
      email_sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("candidate_id", candidateId);
  if (error) throw new Error(`Failed to update email status: ${error.message}`);
}
