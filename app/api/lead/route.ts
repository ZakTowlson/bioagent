import { NextResponse } from "next/server";
import { complete, completeJSON, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import {
  classifyMessages,
  classifySystemPrompt,
  fullReflectionSystemPrompt,
  insightMessages,
  type LeadTags,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadBody = {
  email?: string;
  name?: string;
  history?: Exchange[];
  archetype?: string;
  tags?: LeadTags | null;
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
  const archetype = typeof body.archetype === "string" ? body.archetype : "";
  const presetTags = body.tags ?? null;
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  // --- Capture the lead ---
  // Stubbed for now: logged server-side so nothing is lost. Wire up a real
  // destination by setting the RESEND_* env vars below, or swap in Sheets /
  // Mailchimp / Airtable here.
  const at = new Date().toISOString();
  const transcript = history
    .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
    .join("\n\n");

  console.log("[lead] captured:", { email, name, answers: history.length, at });

  // --- Generate the reflection (the reward). Classify only if the client
  // didn't already send tags from the /api/insight step (saves a call). ---
  let reflection = "";
  let tags: LeadTags | null = presetTags;
  if (process.env.OPENAI_API_KEY && history.length >= TOTAL_QUESTIONS) {
    const reflectionP = complete(
      fullReflectionSystemPrompt(archetype),
      insightMessages(history),
    ).catch((err) => {
      console.error("[lead] reflection generation failed:", err);
      return "";
    });
    const tagsP: Promise<LeadTags | null> = presetTags
      ? Promise.resolve(presetTags)
      : completeJSON<LeadTags>(classifySystemPrompt(), classifyMessages(history)).catch(
          (err) => {
            console.error("[lead] classification failed:", err);
            return null;
          },
        );
    const [r, t] = await Promise.all([reflectionP, tagsP]);
    reflection = r;
    tags = t;
  }

  // --- Save to Google Sheet (via an Apps Script web app webhook) ---
  // Leads tab columns: Timestamp | Name | Email | Summary | Theme | Readiness | Archetype.
  // Summary falls back to the raw answers if the reflection couldn't be made.
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
          summary: reflection || transcript,
          theme: tags?.theme ?? "",
          readiness: tags?.readiness ?? "",
          archetype,
        }),
      });
    } catch (err) {
      console.error("[lead] google sheet save failed:", err);
      // Don't fail the signup if the sheet is unreachable.
    }
  }

  if (
    process.env.RESEND_API_KEY &&
    process.env.LEAD_NOTIFY_TO &&
    process.env.LEAD_NOTIFY_FROM
  ) {
    try {
      await sendViaResend(email, name, history, reflection);
    } catch (err) {
      console.error("[lead] resend notify failed:", err);
      // Don't fail the user's submission if notification fails.
    }
  }

  return NextResponse.json({ ok: true, reflection });
}

async function sendViaResend(
  email: string,
  name: string,
  history: Exchange[],
  reflection: string,
) {
  const transcript = history
    .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
    .join("\n\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.LEAD_NOTIFY_FROM,
      to: process.env.LEAD_NOTIFY_TO,
      subject: `New 10 Questions lead: ${name || email}`,
      text: `Email: ${email}\nName: ${name || "(not given)"}\n\n--- Transcript ---\n${transcript}\n\n--- Full reflection shown ---\n${reflection}`,
    }),
  });
}
