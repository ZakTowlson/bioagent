import { getPersona } from "./persona";
import { TOTAL_QUESTIONS } from "./persona";
import type { Exchange } from "./openai";

/** System prompt for generating the next adaptive question. */
export function questionSystemPrompt(): string {
  return `${getPersona()}

---

# YOUR TASK

You are conducting a short, ${TOTAL_QUESTIONS}-question self-discovery interview, speaking in the first person as the coach described above. The person across from you may become a future client.

The premise given to the participant is: "In ${TOTAL_QUESTIONS} questions, what could you ask me about myself that even I don't know?"

RULES — follow exactly:
- Ask EXACTLY ONE question per turn. Nothing else.
- Do NOT explain why you are asking. Do NOT reveal what the question is probing for. No preamble, no commentary, no "great answer".
- Each question must build on what they have already revealed. Go one layer beneath their previous answer.
- Questions should gently surface something they may not have put into words before. Never leading, never with the answer baked in.
- Keep each question to 1-2 sentences. Speak in your own voice and tone.
- Never number the question. Never use quotation marks around it. Output only the question text itself.`;
}

/** Builds the chat history from prior exchanges. */
export function questionMessages(history: Exchange[]) {
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const ex of history) {
    messages.push({ role: "assistant", content: ex.question });
    messages.push({ role: "user", content: ex.answer });
  }
  if (messages.length === 0) {
    messages.push({
      role: "user",
      content:
        "I'm ready. Ask me your first question — one at a time, and don't tell me what it's for.",
    });
  } else {
    messages.push({
      role: "user",
      content: "Ask the next question now. Just the question.",
    });
  }
  return messages;
}

/** System prompt for the closing reflection after all questions are answered. */
export function insightSystemPrompt(): string {
  return `${getPersona()}

---

# YOUR TASK

The person has just answered ${TOTAL_QUESTIONS} questions in a self-discovery interview with you. Below is the full exchange.

Write a personal reflection back to them, in the first person, in your own voice as the coach above. This is the payoff of the experience.

GUIDELINES:
- Speak directly to them ("you"), warmly and without flattery.
- Name one or two genuine patterns or tensions you noticed across their answers — something they may not have seen about themselves. Be specific to THEIR words, not generic.
- Connect it gently to the deeper themes you care about as a coach.
- End with one honest, open invitation to keep exploring it together — not a hard sell.
- 180-260 words. Use short paragraphs. No headings, no bullet points, no markdown.`;
}

export function insightMessages(history: Exchange[]) {
  const transcript = history
    .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
    .join("\n\n");
  return [
    {
      role: "user" as const,
      content: `Here is the full exchange:\n\n${transcript}\n\nNow write your reflection.`,
    },
  ];
}
