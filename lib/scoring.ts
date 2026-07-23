import type { Exchange } from "./openai";

export type ArchetypeId =
  | "overthinker"
  | "perfectionist"
  | "self-doubter"
  | "avoider"
  | "people-pleaser"
  | "drifter"
  | "validation-seeker";

export type SubScores = {
  identity: number;
  selfTrust: number;
  emotionalControl: number;
  consistency: number;
  actionTaking: number;
};

export type ScoringResult = {
  overallScore: number;
  subScores: SubScores;
  primaryArchetype: ArchetypeId;
  secondaryArchetype: ArchetypeId;
  archetypeScores: Record<ArchetypeId, number>;
};

export const ARCHETYPES: Record<ArchetypeId, { label: string; colour: string; tagline: string; description: string }> = {
  overthinker: {
    label: "The Overthinker",
    colour: "#4A90D9",
    tagline: "You know what to do. You just can't stop analysing long enough to do it.",
    description: "You seek certainty before action. The more something matters, the longer you delay — not from laziness, but from a deep fear of getting it wrong.",
  },
  perfectionist: {
    label: "The Perfectionist",
    colour: "#E8A838",
    tagline: "High standards are your strength. They're also your prison.",
    description: "You hold yourself to a standard almost nothing can meet. So instead of shipping imperfect work, you refine — or you don't start at all.",
  },
  "self-doubter": {
    label: "The Self-Doubter",
    colour: "#9B59B6",
    tagline: "You're more capable than you believe. That gap is everything.",
    description: "You've broken enough promises to yourself that you no longer fully trust your own word. Every new attempt carries the weight of every past failure.",
  },
  avoider: {
    label: "The Avoider",
    colour: "#E74C3C",
    tagline: "You're not lazy. You're running from something you haven't named yet.",
    description: "When tasks feel uncomfortable, you disappear into distraction. You know what needs to be done — the discomfort of doing it is what stops you.",
  },
  "people-pleaser": {
    label: "The People Pleaser",
    colour: "#2ECC71",
    tagline: "You've spent so long making others comfortable that you've forgotten what you actually want.",
    description: "Your decisions are filtered through other people's approval. Fear of conflict or disappointment quietly steers your life in directions that aren't yours.",
  },
  drifter: {
    label: "The Drifter",
    colour: "#95A5A6",
    tagline: "You're not stuck. You're just moving without a destination.",
    description: "You have energy and ability but no clear direction. Without a compelling vision pulling you forward, you drift — busy but not progressing.",
  },
  "validation-seeker": {
    label: "The Validation Seeker",
    colour: "#F39C12",
    tagline: "You need people to see it before you believe it yourself.",
    description: "External recognition has become the measure of your worth. Without it, doubt floods in — even when you've done the work.",
  },
};

export const SCORING_RUBRIC = `
You are scoring a self-discovery interview to diagnose self-sabotage patterns.

TASK: Read the full interview transcript below and return ONLY a JSON object with this exact structure:
{
  "subScores": {
    "identity": <0-100>,
    "selfTrust": <0-100>,
    "emotionalControl": <0-100>,
    "consistency": <0-100>,
    "actionTaking": <0-100>
  },
  "archetypeScores": {
    "overthinker": <0-100>,
    "perfectionist": <0-100>,
    "self-doubter": <0-100>,
    "avoider": <0-100>,
    "people-pleaser": <0-100>,
    "drifter": <0-100>,
    "validation-seeker": <0-100>
  }
}

SCORING GUIDE:

SUB-SCORES (these measure capability — higher = stronger):
- identity (0-100): How clearly do they see themselves as capable of becoming the person they want to be? High = strong self-concept. Low = disconnected from their potential self.
- selfTrust (0-100): Do they follow through on commitments to themselves? High = consistent. Low = history of broken self-promises, hesitation, distrust of own word.
- emotionalControl (0-100): Can they act despite discomfort, setbacks, or uncertainty? High = regulated, resilient. Low = reactive, avoidant when triggered.
- consistency (0-100): Do they sustain positive behaviours over time? High = disciplined long-term. Low = stop-start cycles, inconsistency.
- actionTaking (0-100): Do they execute or delay? High = bias to action. Low = overthinking, procrastination, paralysis.

ARCHETYPE SCORES (these measure how strongly each pattern shows — higher = stronger match):
- overthinker: High analysis, low action, seeks certainty, delays important decisions, researches endlessly
- perfectionist: High standards, fear of failure, polishes instead of ships, all-or-nothing thinking
- self-doubter: Low self-trust, fears failure, seeks external validation, hesitates, history of self-sabotage
- avoider: Procrastinates, distracts, inconsistent follow-through, escapes discomfort, busy but not progressing
- people-pleaser: Decisions filtered by others' approval, fear of disappointment, suppresses own needs, conflict-avoidant
- drifter: Unclear vision, low direction, moves without purpose, lacks compelling goals
- validation-seeker: Needs external recognition before believing in self, measures worth by others' responses

IMPORTANT:
- Base scores ONLY on what they actually said — their specific words and patterns, not generic assumptions.
- A short blunt answer is not the same as low scores — read for what they're revealing, not just length.
- Sub-scores and archetype scores are independent: someone can have low actionTaking AND high overthinker score.
- Output ONLY the JSON. No prose, no markdown, no explanation.
`;

export function extractPullQuotes(history: Exchange[]): string[] {
  return history
    .map((ex) => ex.answer.trim())
    .filter((a) => a.length > 20 && a.length < 300)
    .slice(0, 5);
}

export function calculateOverallScore(subScores: SubScores): number {
  const avg =
    (subScores.identity +
      subScores.selfTrust +
      subScores.emotionalControl +
      subScores.consistency +
      subScores.actionTaking) /
    5;
  return Math.round(avg);
}

export function getRankedArchetypes(
  archetypeScores: Record<ArchetypeId, number>,
): [ArchetypeId, ArchetypeId] {
  const sorted = (Object.entries(archetypeScores) as [ArchetypeId, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  return [sorted[0][0], sorted[1][0]];
}

export function getScoreColour(score: number): string {
  if (score >= 70) return "#2ECC71";
  if (score >= 45) return "#E8A838";
  return "#E74C3C";
}

export function getScoreLabel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Developing";
  if (score >= 35) return "Blocked";
  return "Critical";
}
