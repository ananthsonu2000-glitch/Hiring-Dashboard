export type Role = "PM" | "SPM";

/** What the founder picks on the upload form: a fixed role, or auto-detect per candidate. */
export type RoleSelection = Role | "AUTO";

export type Recommendation =
  | "Strong Interview"
  | "Interview"
  | "Borderline"
  | "Reject";

export type Confidence = "High" | "Medium" | "Low";

export type EmailStatus = "draft" | "sent" | "failed";

export interface WorkExperienceEntry {
  company: string | null;
  title: string | null;
  duration: string | null;
  description: string | null;
}

export interface EducationEntry {
  institution: string | null;
  degree: string | null;
  year: string | null;
}

/** Structured candidate data extracted verbatim from a resume. Never invented. */
export interface StructuredCandidate {
  name: string | null;
  email: string | null;
  phone: string | null;
  current_role: string | null;
  current_company: string | null;
  location: string | null;
  total_experience_years: number | null;
  education: EducationEntry[];
  work_experience: WorkExperienceEntry[];
  skills: string[];
  projects: string[];
  achievements: string[];
  product_experience: string[];
  leadership_experience: string[];
  metrics_mentioned: string[];
  resume_evidence: string[];
}

export interface ScoreCriterion {
  criterion: string;
  max_score: number;
  score: number;
  evidence: string;
  reasoning: string;
  confidence: Confidence;
}

export interface ScoringResult {
  scores: ScoreCriterion[];
  strongest_evidence: string[];
  key_strengths: string[];
  key_gaps: string[];
  missing_information: string[];
  risks_concerns: string[];
  pre_screen_notes: string;
}

export interface RoleMatch {
  role: Role;
  confidence: Confidence;
  reasoning: string;
}

export interface InterviewBrief {
  candidate_summary: string;
  why_worth_interviewing: string;
  top_areas_to_probe: string[];
  potential_red_flags: string[];
  interview_questions: string[];
}

export interface EmailDraft {
  subject: string;
  body: string;
}

export interface CandidateRecord {
  id: string;
  evaluation_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  current_title: string | null;
  current_company: string | null;
  resume_filename: string;
  role_evaluated: Role | null;
  role_match_reasoning: string | null;
  role_match_confidence: Confidence | null;
  extracted_data: StructuredCandidate;
  total_experience_years: number | null;
  total_score: number;
  max_score: number;
  percentage: number;
  recommendation: Recommendation;
  rank: number | null;
  strongest_evidence: string[];
  key_strengths: string[];
  key_gaps: string[];
  missing_information: string[];
  risks_concerns: string[];
  pre_screen_notes: string | null;
  processing_error: string | null;
  created_at: string;
}

export interface CandidateScoreRecord extends ScoreCriterion {
  id: string;
  candidate_id: string;
}

export interface CandidateOutputRecord {
  candidate_id: string;
  interview_brief: InterviewBrief;
  email_subject: string;
  email_body: string;
  email_status: EmailStatus;
  email_sent_at: string | null;
}

export interface EvaluationRecord {
  id: string;
  role: Role | null;
  created_at: string;
}

/**
 * Progress events streamed from /api/evaluate, which processes one resume
 * per request. "evaluation_ready" always arrives first and carries the
 * evaluationId to reuse on subsequent per-file requests in the same batch.
 */
export type EvaluateProgressEvent =
  | { type: "evaluation_ready"; evaluationId: string }
  | { type: "start"; filename: string }
  | { type: "step"; filename: string; step: string }
  | { type: "role_determined"; filename: string; roleMatch: RoleMatch }
  | { type: "candidate_done"; filename: string; candidate: CandidateRecord }
  | { type: "candidate_error"; filename: string; error: string }
  | { type: "duplicate"; filename: string; message: string };
