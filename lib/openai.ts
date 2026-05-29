import OpenAI from "openai";

let _client: OpenAI | null = null;

/** Lazily create the client so the build doesn't require a key at import time. */
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

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
