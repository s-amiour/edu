import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

const genai = new GoogleGenerativeAI(config.gemini.apiKey);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModel(modelName = "gemini-1.5-pro"): GenerativeModel {
  return genai.getGenerativeModel({ model: modelName });
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn("Gemini API call failed", {
        context,
        attempt,
        maxRetries: MAX_RETRIES,
        error: lastError.message,
      });

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.info("Retrying Gemini call", { context, delayMs: delay, attempt: attempt + 1 });
        await sleep(delay);
      }
    }
  }

  logger.error("Gemini API call exhausted all retries", {
    context,
    error: lastError?.message,
  });
  throw lastError;
}

export async function generateJSON<T = unknown>(
  prompt: string,
  schema?: string,
): Promise<T> {
  const context = "generateJSON";

  return retryWithBackoff(async () => {
    const model = getModel();

    const fullPrompt = schema
      ? `${prompt}\n\nYou MUST respond with valid JSON matching this schema:\n${schema}\n\nReturn ONLY valid JSON with no markdown fences, no explanation, no extra text.`
      : `${prompt}\n\nReturn ONLY valid JSON with no markdown fences, no explanation, no extra text.`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text().trim();

    logger.info("Gemini JSON response received", {
      context,
      responseLength: text.length,
    });

    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      logger.error("Failed to parse Gemini JSON response", {
        context,
        rawResponse: text.substring(0, 500),
      });
      throw new Error("Failed to parse Gemini response as JSON");
    }
  }, context);
}

export async function generateText(prompt: string): Promise<string> {
  const context = "generateText";

  return retryWithBackoff(async () => {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    logger.info("Gemini text response received", {
      context,
      responseLength: text.length,
    });

    return text;
  }, context);
}

export { genai };
