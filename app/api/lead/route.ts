import { NextResponse } from "next/server";
import { complete, type Exchange } from "@/lib/openai";
import { TOTAL_QUESTIONS } from "@/lib/persona";
import { fullReflectionSystemPrompt, insightMessages } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadBody = {
  email?: string;
  name?: string;
  history?: Exchange[];
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

  // --- Generate the full reflection (the reward for signing up) ---
  // Generated here, after capture, so it's never sent to the browser before
  // the email is given — and so it can also be saved to the sheet as SUMMARY.
  let reflection = "";
  if (process.env.OPENAI_API_KEY && history.length >= TOTAL_QUESTIONS) {
    try {
      reflection = await complete(
        fullReflectionSystemPrompt(),
        insightMessages(history),
      );
    } catch (err) {
      console.error("[lead] reflection generation failed:", err);
      // Don't fail the signup — fall back to emailing it.
    }
  }

  // --- Save to Google Sheet (via an Apps Script web app webhook) ---
  // Columns: Timestamp | Name | Email | Summary (the full reflection; falls
  // back to the raw answers if the reflection couldn't be generated).
  if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
    try {
      await fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          at,
          name,
          email,
          summary: reflection || transcript,
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
