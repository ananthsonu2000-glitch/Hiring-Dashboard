import "server-only";
import { generateStructured, SchemaType } from "./client";
import type {
  InterviewBrief,
  Recommendation,
  ScoringResult,
  StructuredCandidate,
} from "@/types";

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    candidate_summary: { type: SchemaType.STRING },
    why_worth_interviewing: { type: SchemaType.STRING },
    top_areas_to_probe: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Exactly 3 areas.",
    },
    potential_red_flags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    interview_questions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "5 to 8 personalized questions.",
    },
  },
  required: [
    "candidate_summary",
    "why_worth_interviewing",
    "top_areas_to_probe",
    "potential_red_flags",
    "interview_questions",
  ],
};

const SYSTEM_INSTRUCTION = `You write concise interview briefs for a founder who is about to interview a candidate.

RULES:
- Base everything on the candidate's actual resume data and their rubric scoring — do not invent facts.
- top_areas_to_probe: exactly 3 areas, prioritizing rubric criteria that scored low, had "Low"/"Medium" confidence, or relied on inference rather than explicit evidence.
- potential_red_flags: only flag things grounded in the data (gaps, unexplained transitions, low-confidence claims) — never speculate about personal characteristics.
- interview_questions: write 5-8 SPECIFIC, personalized questions that reference the candidate's actual resume content (a company, project, or claim they made), combined with what the rubric scoring flagged as weak or unproven. Do not write generic questions like "How do you prioritize features?" — anchor each question in a specific detail from their resume.
  Example of the style wanted: "At XYZ you mentioned launching ABC. How did you decide what entered the first release versus what was postponed?"
- Never use the candidate's name, age, gender, or other protected attributes to shape the brief content itself (you may address them by name where natural).
- Return valid JSON only, matching the provided schema exactly.`;

export async function generateInterviewBrief(
  candidate: StructuredCandidate,
  scoring: ScoringResult,
  recommendation: Recommendation
): Promise<InterviewBrief> {
  const prompt = `Recommendation so far: ${recommendation}

CANDIDATE DATA:
${JSON.stringify(candidate, null, 2)}

RUBRIC SCORING:
${JSON.stringify(scoring, null, 2)}

Write the interview brief now.`;

  return generateStructured<InterviewBrief>({
    systemInstruction: SYSTEM_INSTRUCTION,
    schema,
    prompt,
  });
}
