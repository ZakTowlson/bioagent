import { getPersona } from "./persona";
import { TOTAL_QUESTIONS } from "./persona";
import type { Exchange } from "./openai";
import type { ArchetypeId, SubScores } from "./scoring";
import { ARCHETYPES } from "./scoring";
/** Bump when the prompt changes, so we can confirm which build is live. */
export const PROMPT_VERSION = "v9-diagnostic";

/** System prompt for generating the next adaptive question. */
export function questionSystemPrompt(questionIndex: number): string {
  const arc = getQuestionArc(questionIndex);
  return `${getPersona()}

---

# YOUR TASK

You are conducting a ${TOTAL_QUESTIONS}-question diagnostic interview. Your goal is not general self-discovery — it is to identify the specific self-sabotage patterns that are keeping this person stuck despite having real potential.

This is question ${questionIndex} of ${TOTAL_QUESTIONS}.

## THIS QUESTION'S DIAGNOSTIC TARGET
${arc.target}

## HOW TO ASK
- Build DIRECTLY on their last answer. The question must feel like it grew from what THEY said, not a script.
- ONE sentence. Under 18 words. Plain English — no metaphors, no philosophy, no big words.
- Go a layer deeper than their surface answer — toward the fear, the avoidance, or the thing they haven't said out loud.
- Never repeat their words back exactly.

## SOUND LIKE YOU LISTENED
- Every now and then — NOT every time — open with ONE short sentence that reflects back what they said in your own words, then ask the question. Use this only when there's something real to name.
- Never do a clinical restatement every turn. Most turns are just a clean question.

## REACT TO HOW THEY ANSWERED
- One- or two-word answer: gently call it out. e.g. "One word — what are you not letting yourself say?"
- Long rambling answer: name it. e.g. "Why do you think that took so many words?"
- If they dodge or joke: re-ask the same thing more simply, don't explain yourself.

## OUTPUT
Reply with ONLY: optionally one short reflecting sentence, then ONE question ending in "?". No preamble, no "great answer", no numbering, no quotation marks.`;
}

function getQuestionArc(index: number): { target: string } {
  const arcs: Record<number, string> = {
    1: `SELF-TRUST. Probe whether they follow through on commitments they make to themselves. Do they trust their own word? You're looking for patterns of broken self-promises, hesitation, or consistent execution.`,
    2: `IDENTITY. How clearly do they see themselves as the person capable of achieving what they want? Do they already feel like that person, or does it feel distant and unreal?`,
    3: `ACTION VS OVERTHINKING. When they face an important decision or opportunity, do they act or analyse? You're looking for how much thinking happens before execution — and whether thinking becomes a substitute for doing.`,
    4: `EMOTIONAL CONTROL. How do they respond when things don't go to plan? Do they push through discomfort or retreat? You're probing resilience and emotional regulation under pressure.`,
    5: `AVOIDANCE PATTERNS. When a task feels uncomfortable or important, what do they actually do? You're looking for procrastination, distraction, escapism — the specific ways they avoid what matters.`,
    6: `CONSISTENCY. Can they sustain positive habits and behaviours beyond the initial motivation? You're looking for the stop-start cycle — starting strong then falling off — and what causes it.`,
    7: `OWNERSHIP & RESPONSIBILITY. When things aren't working, where do they place the cause? You're probing whether they take full ownership or look for external reasons. This reveals coaching readiness.`,
    8: `EXTERNAL VALIDATION. How much does fear of judgement or need for others' approval influence their decisions? You're identifying people-pleasers and validation-seekers.`,
    9: `VISION & DIRECTION. How clear are they on what they actually want over the next 3 years? No direction = drifting. You're separating those who are blocked from those who are simply lost.`,
    10: `THE EXECUTION GAP — FINAL QUESTION. Land this on the core of what their answers have revealed. Ask them to imagine operating at full potential for 12 months — how different would their life look? This reveals how big they perceive the gap between where they are and what they're capable of.`,
  };
  return { target: arcs[index] || arcs[1] };
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
        "I'm ready. Ask me your first question — one at a time, simple and honest. Don't tell me what it's for.",
    });
  } else {
    messages.push({
      role: "user",
      content: `Ask question ${next} of ${TOTAL_QUESTIONS}. Hit the diagnostic target in the system prompt. Build directly from my last answer. Reply with only the question (optionally one short reflecting sentence first if it truly fits).`,
    });
  }
  return messages;
}

/** Short, intriguing teaser shown BEFORE the email gate. */
export function teaserSystemPrompt(archetype?: string): string {
  return `${getPersona()}

---

# YOUR TASK

The person has just answered ${TOTAL_QUESTIONS} questions in a self-discovery interview with you. Below is the full exchange.

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

The person has just answered ${TOTAL_QUESTIONS} questions in a self-discovery interview with you. Below is the full exchange. They have now unlocked your full reflection.

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

/** Full diagnostic report shown after the email unlock. */
export function fullReportSystemPrompt(
  primaryArchetype: ArchetypeId,
  secondaryArchetype: ArchetypeId,
  subScores: SubScores,
): string {
  const primary = ARCHETYPES[primaryArchetype];
  const secondary = ARCHETYPES[secondaryArchetype];

  return `${getPersona()}

---

# YOUR TASK

You have just completed a diagnostic interview with someone. You know their results:

Primary Pattern: ${primary.label} — ${primary.description}
Secondary Pattern: ${secondary.label} — ${secondary.description}

Sub-scores (out of 100, higher = stronger):
- Identity: ${subScores.identity}
- Self-Trust: ${subScores.selfTrust}
- Emotional Control: ${subScores.emotionalControl}
- Consistency: ${subScores.consistency}
- Action Taking: ${subScores.actionTaking}

Write their full diagnostic report. This is the payoff. Make them feel understood at a level they have never experienced before. Leave them with precise insight into what is driving their behaviour and why — but not the full picture. They should finish reading thinking "I've never had anyone explain me like this" and "there must be more to discover."

Do NOT sell anything. Do NOT mention next steps, coaching, or programs. Simply deliver value so precise it creates its own pull.

## STRUCTURE (no headings, no labels, flowing paragraphs only):

PARAGRAPH 1 — SURFACE BEHAVIOUR (the mirror)
Describe exactly what their day-to-day pattern looks like from the inside. Not what they do — what it feels like to be them. The internal loop they run. The specific moment the pattern kicks in. Reference their actual words and answers. Make them think "how does he know this?" Short, direct sentences. 3-4 sentences.

PARAGRAPH 2 — THE HIDDEN EMOTIONAL PATTERN
Go one layer deeper. What emotion is running underneath the behaviour? Not what they said — what their answers revealed that they didn't say. What did they minimise, avoid, or leave unfinished? Name it precisely. No hedging — confident, accurate observations only. 2-3 sentences.

PARAGRAPH 3 — THE IDENTITY CONFLICT
Name the gap between who they present themselves as and who they actually feel they are. This is the tension that drives the pattern. Be specific to their archetype combination. Make it uncomfortably accurate. 2-3 sentences.

PARAGRAPH 4 — HOW THIS PATTERN FORMED
Give a precise explanation of where this pattern came from and why it made complete sense at the time it was created. Do not blame anyone. Do not use therapy-speak. Just explain the mechanism clearly — so they feel seen at a deep level for the first time. 3-4 sentences.

PARAGRAPH 5 — THE INVISIBLE COST
Show concretely what this pattern is quietly taking from them. Be specific — confidence, decisions, relationships, money, opportunities, self-respect, time. Not dramatic. Not a lecture. Just accurate and honest. 2-3 sentences.

PARAGRAPH 6 — WHY IT KEEPS REPEATING
Explain the exact mechanism that keeps this pattern locked in place. Why good intentions are not enough to break it. Why they have tried before and ended up back here. This should feel like a key turning in a lock. 2-3 sentences.

PARAGRAPH 7 — THE OPEN LOOP
End with 2-3 sentences that leave them feeling they have only seen the first layer of something much deeper. Do not mention anything to buy or do. Simply make them feel that what was uncovered here is the beginning — and that there are layers of themselves still hidden that this assessment only gestured at.

## TONE & RULES
- Address them directly ("you") throughout. Warm but direct. No flattery.
- Use their exact words and phrases back at them where it lands naturally.
- Short sentences. Plain language. Zero therapy-speak, zero motivational language, zero spiritual language, zero fluff.
- Every sentence must either reveal something, increase tension, or deepen curiosity. Cut anything that does not do one of those three things.
- No markdown, no headings, no bullet points, no labels in the output.
- 350-450 words total.`;
}

export function fullReportMessages(history: Exchange[]) {
  const transcript = history
    .map((ex, i) => `Q${i + 1}: ${ex.question}\nThem: ${ex.answer}`)
    .join("\n\n");
  return [
    {
      role: "user" as const,
      content: `Here is the full interview:\n\n${transcript}\n\nNow write their diagnostic report.`,
    },
  ];
}
