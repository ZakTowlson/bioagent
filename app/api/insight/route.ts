import { NextResponse } from "next/server";
import { complete, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import { insightMessages, insightSystemPrompt } from "@/lib/prompts";

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
    const insight = await complete(
      insightSystemPrompt(),
      insightMessages(history),
    );
    return NextResponse.json({ insight });
  } catch (err) {
    console.error("insight route error:", err);
    return NextResponse.json(
      { error: "Could not generate the reflection right now." },
      { status: 502 },
    );
  }
}
