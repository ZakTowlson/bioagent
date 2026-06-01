import { NextResponse } from "next/server";
import { complete, MODEL, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import { PROMPT_VERSION, questionMessages, questionSystemPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Server is not configured (missing OPENAI_API_KEY)." },
      { status: 500 },
    );
  }

  let history: Exchange[] = [];
  let archetype: string | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.history)) history = body.history;
    if (typeof body?.archetype === "string") archetype = body.archetype;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (history.length >= TOTAL_QUESTIONS) {
    return NextResponse.json(
      { error: "All questions already answered.", done: true },
      { status: 400 },
    );
  }

  try {
    const question = await complete(
      questionSystemPrompt(archetype),
      questionMessages(history),
    );
    if (!question) {
      return NextResponse.json(
        { error: "The model returned an empty question.", detail: "empty_content" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      question,
      index: history.length + 1,
      total: TOTAL_QUESTIONS,
      meta: { model: MODEL, promptVersion: PROMPT_VERSION },
    });
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    console.error("question route error:", e?.status, e?.code, e?.message);
    return NextResponse.json(
      {
        error: "Could not generate a question right now.",
        detail: { status: e?.status ?? null, code: e?.code ?? null, message: e?.message ?? String(err) },
      },
      { status: 502 },
    );
  }
}
