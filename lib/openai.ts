import OpenAI from "openai";

let _client: OpenAI | null = null;

/** Lazily create the client so the build doesn't require a key at import time. */
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// gpt-4o follows the nuanced question style far better than gpt-4o-mini.
// NOTE: gpt-5-* models require OpenAI org ID verification; gpt-4o does not.
export const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export type Exchange = { question: string; answer: string };

/** A single chat completion that returns plain text. Model-agnostic params. */
export async function complete(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: system }, ...messages],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** A completion that returns parsed JSON (or null if it can't be parsed). */
export async function completeJSON<T = Record<string, unknown>>(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<T | null> {
  const res = await getClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: system }, ...messages],
    response_format: { type: "json_object" },
  });
  const txt = res.choices[0]?.message?.content?.trim() ?? "";
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}
