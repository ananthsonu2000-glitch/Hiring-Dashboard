import "server-only";
import { generateStructured, SchemaType } from "./client";
import type { EmailDraft, Recommendation, Role, StructuredCandidate } from "@/types";

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
  },
  required: ["subject", "body"],
};

const SYSTEM_INSTRUCTION = `You draft short, human, editable candidate emails for a startup founder. The founder will review and can edit before sending — write a strong first draft, not a final answer.

RULES:
- Keep it short: 4-8 sentences.
- Sound human and warm, not like corporate boilerplate. No excessive exclamation points, no "We are thrilled to inform you."
- Never mention the internal rubric, scores, percentages, or terms like "Strong Interview"/"Borderline"/"Reject".
- Never reference protected attributes.
- For "Strong Interview" or "Interview": invite them to a conversation, and reference ONE specific, personalized area from their background worth discussing (a real project/company/skill from their resume) — do not use generic phrasing.
- For "Borderline": a warm, honest note that the team is still reviewing candidates and will follow up soon — do not promise an interview, do not reject.
- For "Reject": a brief, respectful, kind close-out. Thank them, keep the door open for the future, no specific reasons or feedback.
- Sign off as "[Founder]" — the founder will replace this with their own name before sending.
- Return valid JSON only, matching the provided schema exactly.`;

export async function generateEmail(
  candidate: StructuredCandidate,
  role: Role,
  recommendation: Recommendation,
  companyName: string
): Promise<EmailDraft> {
  const roleLabel = role === "PM" ? "Product Manager" : "Senior Product Manager";

  const prompt = `Company: ${companyName}
Role applied for: ${roleLabel}
Recommendation status: ${recommendation}

CANDIDATE DATA:
${JSON.stringify(candidate, null, 2)}

Draft the email now.`;

  return generateStructured<EmailDraft>({
    systemInstruction: SYSTEM_INSTRUCTION,
    schema,
    prompt,
  });
}
