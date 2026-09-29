import "server-only";
import { generateStructured, SchemaType } from "./client";
import { PM_RUBRIC, SPM_RUBRIC } from "@/lib/rubrics";
import type { Rubric } from "@/lib/rubrics";
import type { RoleMatch, StructuredCandidate } from "@/types";

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    role: { type: SchemaType.STRING, enum: ["PM", "SPM"] },
    confidence: {
      type: SchemaType.STRING,
      enum: ["High", "Medium", "Low"],
    },
    reasoning: {
      type: SchemaType.STRING,
      description:
        "2-4 sentences citing specific resume evidence, explaining why this role fits better than the other.",
    },
  },
  required: ["role", "confidence", "reasoning"],
};

function describeRubric(rubric: Rubric): string {
  return `${rubric.title} — ${rubric.source}\nWhat it looks for:\n${rubric.criteria
    .map((c) => `- ${c.criterion}: ${c.definition}`)
    .join("\n")}`;
}

const SYSTEM_INSTRUCTION = `You decide which of two open roles — Product Manager (PM) or Senior Product Manager (SPM) — a candidate is the better fit for, based only on their resume.

RULES:
- Pick exactly one role: the one the candidate's actual experience is a stronger match for.
- Base the decision on seniority signals the two roles differ on: scope and complexity of what they owned, whether they operated with no senior PM layer above them versus alongside/under one, whether they've made high-stakes irreversible calls alone, and whether they've set process/standards for other PMs versus building their own first process.
- A candidate with little or no formal PM experience should still get a pick — choose PM by default unless there's clear senior-level evidence, and say so plainly in the reasoning (e.g. "no PM experience found; defaulting to PM").
- Do not use the candidate's name, age, gender, or any protected attribute in the decision.
- Ground the reasoning in specific resume evidence, not generic impressions.
- Return valid JSON only, matching the provided schema exactly.`;

export async function classifyRole(
  candidate: StructuredCandidate
): Promise<RoleMatch> {
  const prompt = `ROLE OPTION 1:
${describeRubric(PM_RUBRIC)}

ROLE OPTION 2:
${describeRubric(SPM_RUBRIC)}

CANDIDATE DATA:
${JSON.stringify(candidate, null, 2)}

Which role is this candidate the better fit for?`;

  const result = await generateStructured<{
    role: "PM" | "SPM";
    confidence: RoleMatch["confidence"];
    reasoning: string;
  }>({
    systemInstruction: SYSTEM_INSTRUCTION,
    schema,
    prompt,
  });

  return result;
}
