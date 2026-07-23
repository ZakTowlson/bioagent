import { NextResponse } from "next/server";
import { completeJSON, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import {
  classifyMessages,
  classifySystemPrompt,
  trollCheckMessages,
  trollCheckSystemPrompt,
  type LeadTags,
} from "@/lib/prompts";
import {
  SCORING_RUBRIC,
  calculateOverallScore,
  getRankedArchetypes,
  type ArchetypeId,
  type SubScores,
} from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

type ScoringRaw = {
  subScores: SubScores;
  archetypeScores: Record<ArchetypeId, number>;
};

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
    const trollCheck = await completeJSON<{ trolling: boolean }>(
      trollCheckSystemPrompt(),
      trollCheckMessages(history),
    ).catch(() => null);

    if (trollCheck?.trolling) {
      return NextResponse.json({ trolled: true });
    }

    const transcript = history
      .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
      .join("\n\n");

    const scoringMessages = [
      {
        role: "user" as const,
        content: `Here is the full interview:\n\n${transcript}\n\nScore this person now. Return only JSON.`,
      },
    ];

    const [scoring, tags] = await Promise.all([
      completeJSON<ScoringRaw>(SCORING_RUBRIC, scoringMessages).catch((err) => {
        console.error("insight scoring failed:", err);
        return null;
      }),
      completeJSON<LeadTags>(classifySystemPrompt(), classifyMessages(history)).catch(
        (err) => {
          console.error("insight classify failed:", err);
          return null;
        },
      ),
    ]);

    if (!scoring) {
      return NextResponse.json(
        { error: "Could not score the interview." },
        { status: 502 },
      );
    }

    const overallScore = calculateOverallScore(scoring.subScores);
    const [primaryArchetype, secondaryArchetype] = getRankedArchetypes(
      scoring.archetypeScores,
    );

    if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
      try {
        await fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "completions",
            at: new Date().toISOString(),
            theme: tags?.theme ?? "",
            readiness: tags?.readiness ?? "",
            answers: transcript,
            overallScore,
            primaryArchetype,
            secondaryArchetype,
          }),
        });
      } catch (err) {
        console.error("insight completion save failed:", err);
      }
    }

    return NextResponse.json({
      overallScore,
      subScores: scoring.subScores,
      archetypeScores: scoring.archetypeScores,
      primaryArchetype,
      secondaryArchetype,
      tags,
    });
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    console.error("insight route error:", e?.status, e?.code, e?.message);
    return NextResponse.json(
      {
        error: "Could not generate results right now.",
        detail: { status: e?.status ?? null, code: e?.code ?? null, message: e?.message ?? String(err) },
      },
      { status: 502 },
    );
  }
}
