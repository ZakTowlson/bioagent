import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

/** Loads Zak's skill sheet (content/persona.md), injected as system context. */
export function getPersona(): string {
  if (cached) return cached;
  const path = join(process.cwd(), "content", "persona.md");
  cached = readFileSync(path, "utf8");
  return cached;
}

export const TOTAL_QUESTIONS = 10;
