import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export class ResumeParseError extends Error {}

export type ResumeFileType = "pdf" | "docx" | "txt";

export const ACCEPTED_EXTENSIONS: Record<ResumeFileType, string[]> = {
  pdf: [".pdf"],
  docx: [".docx"],
  txt: [".txt"],
};

export function detectFileType(filename: string): ResumeFileType | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

/**
 * Extracts plain text from a resume file (PDF, DOCX, or TXT).
 * Throws ResumeParseError for invalid, empty, or unsupported files.
 *
 * Legacy .doc (pre-2007 binary Word format) is intentionally not supported —
 * there's no reliable pure-JS parser for it; ask candidates to re-save as
 * .docx, .pdf, or .txt.
 */
export async function extractResumeText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const fileType = detectFileType(filename);
  if (!fileType) {
    throw new ResumeParseError(
      "Unsupported file type. Upload a .pdf, .docx, or .txt resume."
    );
  }

  let text: string;
  try {
    if (fileType === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else if (fileType === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      text = buffer.toString("utf-8");
    }
  } catch {
    throw new ResumeParseError(
      `Could not read this file as a valid ${fileType.toUpperCase()}.`
    );
  }

  text = text.replace(/\u0000/g, "").trim();

  if (text.length < 30) {
    throw new ResumeParseError(
      "This resume appears to be empty or contains no extractable text (a PDF may be a scanned image with no text layer)."
    );
  }

  return text;
}
