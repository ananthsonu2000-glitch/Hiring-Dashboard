import "server-only";
import { generateStructured, SchemaType } from "./client";
import type { StructuredCandidate } from "@/types";

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, nullable: true },
    email: { type: SchemaType.STRING, nullable: true },
    phone: { type: SchemaType.STRING, nullable: true },
    current_role: { type: SchemaType.STRING, nullable: true },
    current_company: { type: SchemaType.STRING, nullable: true },
    location: { type: SchemaType.STRING, nullable: true },
    total_experience_years: { type: SchemaType.NUMBER, nullable: true },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING, nullable: true },
          degree: { type: SchemaType.STRING, nullable: true },
          year: { type: SchemaType.STRING, nullable: true },
        },
        required: ["institution", "degree", "year"],
      },
    },
    work_experience: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: { type: SchemaType.STRING, nullable: true },
          title: { type: SchemaType.STRING, nullable: true },
          duration: { type: SchemaType.STRING, nullable: true },
          description: { type: SchemaType.STRING, nullable: true },
        },
        required: ["company", "title", "duration", "description"],
      },
    },
    skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    projects: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    achievements: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    product_experience: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    leadership_experience: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    metrics_mentioned: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    resume_evidence: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Short verbatim or near-verbatim quotes/bullets from the resume that are the strongest signal of the candidate's seniority and ownership.",
    },
  },
  required: [
    "name",
    "email",
    "phone",
    "current_role",
    "current_company",
    "location",
    "total_experience_years",
    "education",
    "work_experience",
    "skills",
    "projects",
    "achievements",
    "product_experience",
    "leadership_experience",
    "metrics_mentioned",
    "resume_evidence",
  ],
};

const SYSTEM_INSTRUCTION = `You extract structured candidate data from a resume's raw text.

RULES:
- Extract ONLY information that is actually present in the resume text.
- Never invent, guess, or infer missing information.
- If a field is not present in the resume, return null (for scalar fields) or an empty array (for list fields).
- Do not use the candidate's photograph, age, gender, marital status, religion, caste, or any other protected attribute — none of that will be present in plain resume text anyway, but never fabricate or infer it.
- "resume_evidence" should be short, near-verbatim quotes/bullets that best show ownership, scope, and impact — not a summary.
- Ignore contact-page boilerplate (e.g. "References available on request").
- Return valid JSON only, matching the provided schema exactly.`;

export async function extractCandidateData(
  resumeText: string
): Promise<StructuredCandidate> {
  return generateStructured<StructuredCandidate>({
    systemInstruction: SYSTEM_INSTRUCTION,
    schema,
    prompt: `Resume text:\n"""\n${resumeText.slice(0, 20000)}\n"""\n\nExtract the structured candidate data now.`,
  });
}
