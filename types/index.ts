export type Role = "PM" | "SPM";

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
  role_evaluated: Role;
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
  role: Role;
  created_at: string;
}

/** Progress events streamed from /api/evaluate while processing each resume. */
export type EvaluateProgressEvent =
  | { type: "start"; filename: string; index: number; total: number }
  | { type: "step"; filename: string; step: string }
  | { type: "candidate_done"; filename: string; candidate: CandidateRecord }
  | { type: "candidate_error"; filename: string; error: string }
  | { type: "duplicate"; filename: string; message: string }
  | { type: "all_done"; evaluationId: string; count: number };
