import { NextResponse } from "next/server";
import { complete, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import { questionMessages, questionSystemPrompt } from "@/lib/prompts";

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
  try {
    const body = await req.json();
    if (Array.isArray(body?.history)) history = body.history;
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
      questionSystemPrompt(),
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
