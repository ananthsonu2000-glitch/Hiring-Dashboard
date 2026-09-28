import "server-only";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export class GeminiError extends Error {}

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      "GEMINI_API_KEY is not set. Add it to your environment to run evaluations."
    );
  }
  if (!client) client = new GoogleGenerativeAI(key);
  return client;
}

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export { SchemaType };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini with a structured JSON schema and returns the parsed object.
 * Retries with backoff on transient errors (503/429) or malformed JSON
 * before surfacing a GeminiError.
 */
export async function generateStructured<T>(params: {
  systemInstruction: string;
  prompt: string;
  schema: object;
}): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: params.systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: params.schema as Schema,
      temperature: 0.2,
    },
  });

  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await model.generateContent(params.prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) await sleep(1000 * 2 ** attempt);
    }
  }

  throw new GeminiError(
    `Gemini did not return a usable response: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
