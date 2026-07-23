import { NextResponse } from "next/server";
import { complete, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import { fullReportSystemPrompt, fullReportMessages } from "@/lib/prompts";
import type { ArchetypeId, SubScores } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadBody = {
  email?: string;
  name?: string;
  history?: Exchange[];
  primaryArchetype?: ArchetypeId;
  secondaryArchetype?: ArchetypeId;
  subScores?: SubScores;
  overallScore?: number;
  theme?: string;
  readiness?: string;
};

export async function POST(req: Request) {
  let body: LeadBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const name = (body.name || "").trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const primaryArchetype = body.primaryArchetype;
  const secondaryArchetype = body.secondaryArchetype;
  const subScores = body.subScores;
  const overallScore = body.overallScore ?? 0;
  const theme = body.theme ?? "";
  const readiness = body.readiness ?? "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const at = new Date().toISOString();
  let report = "";

  if (
    process.env.OPENAI_API_KEY &&
    history.length >= TOTAL_QUESTIONS &&
    primaryArchetype &&
    secondaryArchetype &&
    subScores
  ) {
    report = await complete(
      fullReportSystemPrompt(primaryArchetype, secondaryArchetype, subScores),
      fullReportMessages(history),
    ).catch((err) => {
      console.error("[lead] report generation failed:", err);
      return "";
    });
  }

  if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
    try {
      await fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "leads",
          at,
          name,
          email,
          overallScore,
          primaryArchetype: primaryArchetype ?? "",
          secondaryArchetype: secondaryArchetype ?? "",
          identityScore: subScores?.identity ?? "",
          selfTrustScore: subScores?.selfTrust ?? "",
          emotionalControlScore: subScores?.emotionalControl ?? "",
          consistencyScore: subScores?.consistency ?? "",
          actionTakingScore: subScores?.actionTaking ?? "",
          theme,
          readiness,
          report: report || "",
        }),
      });
    } catch (err) {
      console.error("[lead] google sheet save failed:", err);
    }
  }

  return NextResponse.json({ ok: true, report });
}
