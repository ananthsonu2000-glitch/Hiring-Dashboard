import "server-only";
import { generateStructured, SchemaType } from "./client";
import { getRubric, PRE_SCREEN_PATTERNS } from "@/lib/rubrics";
import type { Role, ScoringResult, StructuredCandidate } from "@/types";

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    scores: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          criterion: { type: SchemaType.STRING },
          max_score: { type: SchemaType.NUMBER },
          score: { type: SchemaType.NUMBER },
          evidence: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING },
          confidence: {
            type: SchemaType.STRING,
            enum: ["High", "Medium", "Low"],
          },
        },
        required: [
          "criterion",
          "max_score",
          "score",
          "evidence",
          "reasoning",
          "confidence",
        ],
      },
    },
    strongest_evidence: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    key_strengths: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    key_gaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    missing_information: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    risks_concerns: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    pre_screen_notes: {
      type: SchemaType.STRING,
      description:
        "1-3 sentences on how the candidate reads against the three pre-screen patterns (unprompted ownership, ground-level ops exposure, comfort with no senior layer above them). This is context, not a scored criterion.",
    },
  },
  required: [
    "scores",
    "strongest_evidence",
    "key_strengths",
    "key_gaps",
    "missing_information",
    "risks_concerns",
    "pre_screen_notes",
  ],
};

const SYSTEM_INSTRUCTION = `You are a strict, evidence-driven hiring rubric scorer. The rubric is the source of truth — not how impressive the resume sounds.

RULES:
- Score ONLY the criteria given. Each criterion has a max_score (its weight). Award 0 to max_score based on how well the resume evidences that specific criterion.
- Every score must cite explicit resume evidence in the "evidence" field, quoting or closely paraphrasing the resume.
- Separate EXPLICIT EVIDENCE (directly stated) from INFERENCE (reasonably suggested but not confirmed) in your "reasoning" field. Inference must never be treated as strong evidence and must not drive a high score on its own.
- If there is no evidence for a criterion, score it low per the rubric, set evidence to "No supporting evidence found in resume", and do NOT assume the candidate has the experience.
- Do not use the candidate's name, age, gender, or any protected attribute as a scoring signal.
- Do not reward vague, generic, or resume-buzzword language without concrete specifics (numbers, systems, decisions, outcomes).
- key_gaps and missing_information are different: key_gaps = the candidate appears to lack this given what's on the resume; missing_information = the rubric needs this but the resume simply doesn't say either way. Keep them distinct.
- pre_screen_notes should mention only what's evidenced, and flag "no evidence found" where a pattern isn't shown, rather than assuming its absence.
- Return valid JSON only, matching the provided schema exactly.`;

function buildPrompt(candidate: StructuredCandidate, role: Role): string {
  const rubric = getRubric(role);
  const criteriaBlock = rubric.criteria
    .map(
      (c, i) =>
        `${i + 1}. "${c.criterion}" — max_score ${c.weight}\n   Definition: ${c.definition}\n   JD reference: ${c.jd_reference}`
    )
    .join("\n");

  const patternsBlock = PRE_SCREEN_PATTERNS.map(
    (p) => `- ${p.name}: ${p.description}`
  ).join("\n");

  return `Role being evaluated for: ${rubric.title}

RUBRIC CRITERIA (score each one independently, out of its max_score):
${criteriaBlock}

PRE-SCREEN PATTERNS (context only, not scored — note if evidenced or not):
${patternsBlock}

STRUCTURED CANDIDATE DATA (already extracted from the resume; nothing here was invented):
${JSON.stringify(candidate, null, 2)}

Score this candidate against the rubric now.`;
}

export async function scoreCandidate(
  candidate: StructuredCandidate,
  role: Role
): Promise<ScoringResult> {
  return generateStructured<ScoringResult>({
    systemInstruction: SYSTEM_INSTRUCTION,
    schema,
    prompt: buildPrompt(candidate, role),
  });
}
