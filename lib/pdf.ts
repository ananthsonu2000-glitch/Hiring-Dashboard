import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export class PdfParseError extends Error {}

/** Extracts plain text from a PDF buffer. Throws PdfParseError for invalid/empty PDFs. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } catch {
    throw new PdfParseError("Could not read this file as a valid PDF.");
  }

  text = text.replace(/\u0000/g, "").trim();

  if (text.length < 30) {
    throw new PdfParseError(
      "This PDF appears to be empty or contains no extractable text (it may be a scanned image)."
    );
  }

  return text;
}
