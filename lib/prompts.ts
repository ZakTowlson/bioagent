import { getPersona } from "./persona";
import { TOTAL_QUESTIONS } from "./persona";
import type { Exchange } from "./openai";

/** Bump when the prompt changes, so we can confirm which build is live. */
export const PROMPT_VERSION = "v8-simple";

/** The five reader archetypes the agent adapts to (chosen at the start). */
export const ARCHETYPES = [
  {
    id: "faith",
    label: "Faith & meaning",
    desc: "I see my life through faith.",
    guidance:
      "They process life through Christian / Orthodox faith. You may gently use the language of soul, conscience, calling, grace and meaning. Warm, reverent, unhurried.",
  },
  {
    id: "analytical",
    label: "Analytical & logical",
    desc: "I think in logic and evidence.",
    guidance:
      "They are rational and evidence-minded and may see this as 'just AI'. Frame everything as patterns, cause-and-effect, and honest logic. Avoid overt spiritual or 'woo' language — be precise and grounded, and earn their trust.",
  },
  {
    id: "seeker",
    label: "Seeker / self-aware",
    desc: "I'm on a journey of growth.",
    guidance:
      "They are introspective and growth-oriented. You can go deeper sooner and use the language of self-awareness, patterns and inner work.",
  },
  {
    id: "driven",
    label: "Driven / ambitious",
    desc: "I'm building something.",
    guidance:
      "Founder / leader / performance mindset. Frame around goals, identity, standards and what's blocking execution. Be direct and sharp; respect their time.",
  },
  {
    id: "crossroads",
    label: "At a crossroads",
    desc: "I feel stuck or searching.",
    guidance:
      "They feel stuck or lost. Be gentle and orienting; help them find clarity. Don't be confrontational early — build a little safety first, then go deeper.",
  },
] as const;

export type ArchetypeId = (typeof ARCHETYPES)[number]["id"];

function archetypeGuidance(id?: string): string {
  const a = ARCHETYPES.find((x) => x.id === id);
  if (!a) return "No archetype was given — adapt naturally to how they answer.";
  return `${a.label} — ${a.guidance}`;
}

/** System prompt for generating the next adaptive question. */
export function questionSystemPrompt(): string {
  return `${getPersona()}

---

# YOUR TASK

You are conducting a ${TOTAL_QUESTIONS}-question self-discovery interview. The premise the person was given is: "In ${TOTAL_QUESTIONS} questions, what could you ask me about myself that even I don't know? Ask me one question at a time, without telling me the reason or the question."

The persona above tells you WHO you are and WHAT matters (fear beneath behaviour, the self you're becoming, self-honesty, identity, permission). But it does NOT dictate the FORM of your questions. Even though the book is poetic and scriptural, your QUESTIONS here must be the opposite: plain, short, and sharp. No poetry, no scripture, no metaphor in the questions themselves.

## HOW TO ASK (this is everything)
- Build DIRECTLY on their last answer. The next question must clearly grow out of what THEY said — not a script. It should feel like a real conversation with someone who was actually listening.
- ONE sentence. Usually under 18 words. Plain English — they should get it immediately. No abstract or philosophical language. No metaphors. No big words. Simple is better.
- Go a layer deeper than their answer when you can — toward the fear, the thing they're avoiding, or what they haven't said out loud. But keep it concrete and easy to understand.
- Never repeat their words back exactly. Be calm, direct, never pushy.

## SOUND LIKE YOU LISTENED
- Every now and then — NOT every time — open with ONE short sentence that reflects back what they just said, in your own warm words, so they feel heard. Then ask the question. Example:
  "So it's not really the work you're avoiding — it's what finishing it would mean.
  What are you afraid it would prove?"
- Use this only a few times across the whole interview, when there's something real to name. Most turns are just a clean question, no preamble.
- Never do a clinical, every-question restatement ("You're recognising…", "It sounds like…"). When you do reflect, make it human and true — a single natural line, not a summary.

## REACT TO HOW THEY ANSWERED
- One- or two-word answer: gently call it out and turn it on them. e.g. "One word — what are you not letting yourself say?"
- Long, rambling answer: name it. e.g. "Why do you think that took so many words?"
- If they dodge, joke, or say they don't understand: do NOT explain yourself — just re-ask the same thing more simply.

## OUTPUT
Reply with ONLY: optionally one short reflecting sentence, then ONE question ending in "?". No preamble, no "great answer", no coaching commentary, no numbering, no quotation marks around the question.`;
}

/** Builds the chat history from prior exchanges plus a light next-turn nudge. */
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
        "I'm ready. Ask me your first question — one at a time, simple and human, and don't tell me what it's for.",
    });
  } else {
    const depth =
      next >= TOTAL_QUESTIONS
        ? "This is the final question — land it on the core of what they've revealed."
        : next >= 7
          ? "We're deep now — follow their answers toward the real fear or the permission they're withholding."
          : next >= 4
            ? "Build on their last answer and go a step deeper."
            : "Build on their last answer and open the thread a little wider.";
    messages.push({
      role: "user",
      content: `This is question ${next} of ${TOTAL_QUESTIONS}. ${depth} Make it follow directly from my last answer, keep it simple, and reply with only the question (you may open with one short reflecting sentence if it truly fits).`,
    });
  }
  return messages;
}

/** Short, intriguing teaser shown BEFORE the email gate. */
export function teaserSystemPrompt(archetype?: string): string {
  return `${getPersona()}

---

# YOUR TASK

The person has just answered ${TOTAL_QUESTIONS} questions in a self-discovery interview with you. Below is the full exchange. They told us: ${archetypeGuidance(archetype)} — adapt your tone accordingly.

Write ONE short paragraph (3-4 sentences, under ~70 words) that will be shown to them BEFORE they unlock the full reflection.

This is a HOOK, not the answer. Its only job is to make them want to read the rest.

GUIDELINES:
- Speak directly to them ("you"). Make them feel seen — reference something specific from THEIR answers.
- Hint that you noticed a pattern running underneath their answers — but DO NOT reveal what it is. Say it's there; hold back the detail.
- End with a line that makes them curious — a short question or unfinished thought.
- Keep it plain and simple. Short sentences. Like you're talking to a friend, not writing a book. No poetry, no big words, no metaphors. No markdown.
- Never mention email or signing up.`;
}

/** Troll detection — checks if answers were not genuine. */
export function trollCheckSystemPrompt(): string {
  return `You are checking whether a person genuinely engaged with a self-discovery questionnaire or whether they trolled it with nonsense, joke answers, or completely random responses.

Respond with ONLY a JSON object: { "trolling": true } or { "trolling": false }.

Mark trolling as true if: most answers are clearly random, offensive, meaningless, or written as a joke with no real attempt to engage. A short or blunt answer alone is NOT trolling — only flag it if the overall pattern shows they weren't taking it seriously at all.`;
}

export function trollCheckMessages(history: Exchange[]) {
  const transcript = history
    .map((ex, i) => `Q${i + 1}: ${ex.question}\nAnswer: ${ex.answer}`)
    .join("\n\n");
  return [
    {
      role: "user" as const,
      content: `Here are the answers:\n\n${transcript}\n\nWere they trolling? Reply with only JSON.`,
    },
  ];
}

/** The full payoff reflection, revealed AFTER they give their email. */
export function fullReflectionSystemPrompt(archetype?: string): string {
  return `${getPersona()}

---

# YOUR TASK

The person has just answered ${TOTAL_QUESTIONS} questions in a self-discovery interview with you. Below is the full exchange. They have now unlocked your full reflection. They told us: ${archetypeGuidance(archetype)} — adapt your tone accordingly.

Write the full closing reflection back to them. This is the payoff — say the thing they haven't been able to say themselves, and leave them feeling genuinely understood.

GUIDELINES:
- Talk to them directly ("you"). Warm but straight. Don't flatter them.
- Get to the one real thing that's holding them back — the fear, the habit, or the story they keep telling themselves. Use what they actually said. Be specific, not general.
- Write like a real person talking to them, not like a book or a therapist's report. Keep it simple. Short sentences. No big words, no poetic phrases, no philosophy.
- End with one honest line about a next step — not pushy, just real.
- 150-200 words. Short paragraphs, some single lines for impact. No headings, no bullet points, no markdown.`;
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

/** The themes a lead can be tagged with (aligned to Zak's coaching). */
export const LEAD_THEMES = [
  "Fear & avoidance",
  "Purpose & calling",
  "Relationships & love",
  "Faith & meaning",
  "Ambition & work",
  "Identity & self-worth",
  "Healing & the past",
] as const;

export type LeadTags = {
  theme: string;
  readiness: "High" | "Medium" | "Low";
};

/** Classifies a completed interview to help Zak prioritise and prepare. */
export function classifySystemPrompt(): string {
  return `You analyse a completed ${TOTAL_QUESTIONS}-question self-discovery interview to help a life coach prioritise potential clients.

Respond with ONLY a JSON object with exactly these two fields:
- "theme": the single dominant theme of this person, chosen from EXACTLY one of: ${LEAD_THEMES.map((t) => `"${t}"`).join(", ")}.
- "readiness": one of "High", "Medium", "Low" — how ready this person seems to actually do the work and engage a coach, judged by their self-awareness, honesty, and urgency.

Output only the JSON. No prose, no markdown.`;
}

export function classifyMessages(history: Exchange[]) {
  const transcript = history
    .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
    .join("\n\n");
  return [
    {
      role: "user" as const,
      content: `Here is the interview:\n\n${transcript}\n\nClassify this person now as JSON.`,
    },
  ];
}
