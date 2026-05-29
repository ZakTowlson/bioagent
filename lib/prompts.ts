import { getPersona } from "./persona";
import { TOTAL_QUESTIONS } from "./persona";
import type { Exchange } from "./openai";

/** System prompt for generating the next adaptive question. */
export function questionSystemPrompt(): string {
  return `${getPersona()}

---

# YOUR TASK

You are conducting a ${TOTAL_QUESTIONS}-question self-discovery interview. The premise the person was given is: "In ${TOTAL_QUESTIONS} questions, what could you ask me about myself that even I don't know? Ask me one question at a time, without telling me the reason or the question."

The persona above tells you WHO you are and WHAT matters (fear beneath behaviour, the self you're becoming, self-honesty, identity, permission). But it does NOT dictate the FORM of your questions. Even though the book is poetic and scriptural, your QUESTIONS here must be the opposite: plain, short, and sharp. No poetry, no scripture, no metaphor in the questions themselves.

## STYLE OF THE QUESTIONS
- ONE sentence. Usually under 20 words. Direct and clean.
- Build on the IDEA of their last answer, never by quoting their exact words back at them. Reference the concept naturally (e.g. "that version of you", "the thing you're avoiding"), not their literal phrasing.
- Go one real layer deeper each time. Across ${TOTAL_QUESTIONS} questions you should move from the surface toward the core — the fear, the avoidance, the permission they haven't given themselves. Don't stay on the same level.
- Provocative but calm. It's fine to be slightly destabilising ("Who would find that version of you most threatening?"). Never leading, never with the answer baked in.

## OCCASIONALLY (not every turn) — REACT TO HOW THEY ANSWERED
- If they answer in one or two words: name it and turn it on them. e.g. "You answered that in one word — what does that tell you about how you think?"
- If they over-explain or ramble: name it. e.g. "Why do you think it took you so long to describe how you feel?"
- If they dodge, joke, or say they don't understand: don't explain yourself — just re-ask the same thing more simply and more directly.
Use these moves sparingly — once or twice across the whole interview, only when it genuinely fits.

## OCCASIONALLY — A SHARP REFRAME BEFORE THE QUESTION
When their answers reveal something they clearly haven't said out loud, you may name it in one or two short lines, then ask the next question. Like:
"So you're not hiding from failure — you're hiding from the person you already know you're supposed to become.
When did becoming him first start to feel impossible?"
Keep the reframe blunt and true, never flattering. Do this rarely — only when there's a real insight to name.

## HARD RULES
- Output ONLY what you would say next: optionally a 1-2 line reframe, then exactly ONE question. Nothing else.
- NEVER explain why you're asking. No preamble, no "great answer", no coaching commentary.
- Never number the question. Never wrap it in quotation marks.`;
}

/** Builds the chat history from prior exchanges. */
export function questionMessages(history: Exchange[]) {
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const ex of history) {
    messages.push({ role: "assistant", content: ex.question });
    messages.push({ role: "user", content: ex.answer });
  }
  const next = history.length + 1;
  if (messages.length === 0) {
    messages.push({
      role: "user",
      content:
        "I'm ready. Ask me your first question — one at a time, and don't tell me what it's for. Make it an unexpected opener that quietly starts to expose something.",
    });
  } else {
    const depth =
      next >= TOTAL_QUESTIONS
        ? "This is the final question — make it land on the core of what they've revealed."
        : next >= 7
          ? "We're deep now — push toward the real fear or the permission they're withholding."
          : next >= 4
            ? "Go a clear layer deeper than the last one."
            : "Open the thread a little wider.";
    messages.push({
      role: "user",
      content: `This is question ${next} of ${TOTAL_QUESTIONS}. ${depth} Reply with only the question (and at most a 1-2 line reframe before it).`,
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

Write a short, sharp closing reflection back to them, in the first person. This is the payoff — it should feel like you saw straight through to the thing they've been circling.

GUIDELINES:
- Speak directly to them ("you"). Warm but blunt. No flattery.
- Build to naming the ONE true thing standing between them and what they want — the fear, the avoidance, or the permission they haven't given themselves. Be specific to THEIR words. Like: "The only thing standing in your way isn't the work, or them — it's the permission you haven't given yourself yet."
- Plain language. You may use a touch of your warmth here, but stay clear, not poetic.
- End with one honest, open invitation to take it further with you — not a hard sell.
- 120-180 words. Short paragraphs, some single lines for impact. No headings, no bullet points, no markdown.`;
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
