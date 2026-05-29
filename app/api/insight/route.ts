import { NextResponse } from "next/server";
import { complete, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import { insightMessages, teaserSystemPrompt } from "@/lib/prompts";

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

  if (history.length < TOTAL_QUESTIONS) {
    return NextResponse.json(
      { error: "Not all questions have been answered yet." },
      { status: 400 },
    );
  }

  try {
    const teaser = await complete(teaserSystemPrompt(), insightMessages(history));
    if (!teaser) {
      return NextResponse.json(
        { error: "The model returned an empty teaser." },
        { status: 502 },
      );
    }
    return NextResponse.json({ teaser });
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    console.error("insight route error:", e?.status, e?.code, e?.message);
    return NextResponse.json(
      {
        error: "Could not generate the reflection right now.",
        detail: { status: e?.status ?? null, code: e?.code ?? null, message: e?.message ?? String(err) },
      },
      { status: 502 },
    );
  }
}
