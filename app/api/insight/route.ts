import { NextResponse } from "next/server";
import { complete, completeJSON, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import {
  classifyMessages,
  classifySystemPrompt,
  insightMessages,
  teaserSystemPrompt,
  trollCheckMessages,
  trollCheckSystemPrompt,
  type LeadTags,
} from "@/lib/prompts";

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

  if (history.length < TOTAL_QUESTIONS) {
    return NextResponse.json(
      { error: "Not all questions have been answered yet." },
      { status: 400 },
    );
  }

  try {
    // Check if the person was trolling before doing anything else.
    const trollCheck = await completeJSON<{ trolling: boolean }>(
      trollCheckSystemPrompt(),
      trollCheckMessages(history),
    ).catch(() => null);

    if (trollCheck?.trolling) {
      return NextResponse.json({
        teaser:
          "Looks like you weren't really here for this one — and that's fine. If you ever want to come back and actually give it a go, it'll be here.",
        tags: null,
        trolled: true,
      });
    }

    // Teaser (shown now) + classification (for tracking + later lead), in parallel.
    const [teaser, tags] = await Promise.all([
      complete(teaserSystemPrompt(archetype), insightMessages(history)),
      completeJSON<LeadTags>(classifySystemPrompt(), classifyMessages(history)).catch(
        (err) => {
          console.error("insight classify failed:", err);
          return null;
        },
      ),
    ]);

    if (!teaser) {
      return NextResponse.json(
        { error: "The model returned an empty teaser." },
        { status: 502 },
      );
    }

    // Anonymous completion row (no name/email) — captures everyone who finishes.
    if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
      const transcript = history
        .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
        .join("\n\n");
      try {
        await fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "completions",
            at: new Date().toISOString(),
            archetype: archetype ?? "",
            theme: tags?.theme ?? "",
            readiness: tags?.readiness ?? "",
            answers: transcript,
          }),
        });
      } catch (err) {
        console.error("insight completion save failed:", err);
      }
    }

    return NextResponse.json({ teaser, tags });
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
