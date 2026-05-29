import { NextResponse } from "next/server";
import type { Exchange } from "@/lib/openai";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadBody = {
  email?: string;
  name?: string;
  history?: Exchange[];
  insight?: string;
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
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  // --- Lead destination ---
  // Stubbed for now: logged server-side so nothing is lost. Wire up a real
  // destination by setting the RESEND_* env vars below, or swap in Sheets /
  // Mailchimp / Airtable here.
  console.log("[lead] captured:", {
    email,
    name,
    answers: body.history?.length ?? 0,
    at: new Date().toISOString(),
  });

  if (
    process.env.RESEND_API_KEY &&
    process.env.LEAD_NOTIFY_TO &&
    process.env.LEAD_NOTIFY_FROM
  ) {
    try {
      await sendViaResend(email, name, body.history ?? [], body.insight ?? "");
    } catch (err) {
      console.error("[lead] resend notify failed:", err);
      // Don't fail the user's submission if notification fails.
    }
  }

  return NextResponse.json({ ok: true });
}

async function sendViaResend(
  email: string,
  name: string,
  history: Exchange[],
  insight: string,
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
      text: `Email: ${email}\nName: ${name || "(not given)"}\n\n--- Transcript ---\n${transcript}\n\n--- Reflection shown ---\n${insight}`,
    }),
  });
}
