"use client";

import { useState } from "react";
import { ARCHETYPES, getScoreColour, getScoreLabel, type ArchetypeId, type SubScores } from "@/lib/scoring";

type Exchange = { question: string; answer: string };
type Stage = "capture" | "interview" | "reflecting" | "result";

const TOTAL = 10;
const INSTAGRAM_URL = "https://www.instagram.com/thevikingchristian/";

type InsightResult = {
  overallScore: number;
  subScores: SubScores;
  archetypeScores: Record<ArchetypeId, number>;
  primaryArchetype: ArchetypeId;
  secondaryArchetype: ArchetypeId;
  tags: { theme?: string; readiness?: string } | null;
  trolled?: boolean;
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("capture");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState<InsightResult | null>(null);
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportUnlocked, setReportUnlocked] = useState(false);

  const index = history.length + 1;

  async function fetchQuestion(current: Exchange[]) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setQuestion(data.question);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function startInterview() {
    setStage("interview");
    await fetchQuestion([]);
  }

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    const updated = [...history, { question, answer: answer.trim() }];
    setHistory(updated);
    setAnswer("");
    if (updated.length >= TOTAL) {
      await fetchInsight(updated);
    } else {
      await fetchQuestion(updated);
    }
  }

  async function fetchInsight(final: Exchange[]) {
    setStage("reflecting");
    setError("");
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: final }),
      });
      const data: InsightResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || "Something went wrong.");
      setInsight(data);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("result");
    }
  }

  async function unlockReport() {
    if (!insight || reportLoading || reportUnlocked) return;
    const email = emailInput.trim();
    const name = nameInput.trim();
    if (!email || !email.includes("@") || !name) return;
    setLeadEmail(email);
    setLeadName(name);
    setReportLoading(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          history,
          primaryArchetype: insight.primaryArchetype,
          secondaryArchetype: insight.secondaryArchetype,
          subScores: insight.subScores,
          overallScore: insight.overallScore,
          theme: insight.tags?.theme ?? "",
          readiness: insight.tags?.readiness ?? "",
        }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
      setReportUnlocked(true);
    } catch (e) {
      console.error("unlock failed:", e);
      setReportUnlocked(true);
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      {stage === "capture" && (
        <div className="mx-auto w-full max-w-md text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soul-ark-logo.png" alt="Soul Ark" className="mx-auto mb-4 h-12 w-12 object-contain" />
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-accent">The Soul Audit</p>
          <h1 className="mb-4 font-serif text-4xl leading-tight sm:text-5xl">
            Why are you still stuck?
          </h1>
          <p className="mb-2 font-sans text-base text-foreground/70">
            You know you&apos;re capable of more. This finds out exactly what&apos;s in the way.
          </p>
          <p className="mb-10 font-sans text-sm text-foreground/40">
            10 questions. Diagnostic score. Free.
          </p>
          <button
            onClick={startInterview}
            className="rounded-full bg-accent px-10 py-3.5 font-sans text-sm font-semibold text-background transition hover:opacity-90"
          >
            Start the audit →
          </button>
          <p className="mt-4 font-sans text-xs text-foreground/30">Takes 5 minutes. No signup required.</p>
        </div>
      )}

      {stage === "interview" && (
        <Interview
          index={index}
          total={TOTAL}
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          onSubmit={submitAnswer}
          loading={loading}
          error={error}
          onRetry={() => fetchQuestion(history)}
        />
      )}

      {stage === "reflecting" && <Reflecting />}

      {stage === "result" && (
        <Result
          insight={insight}
          report={report}
          reportUnlocked={reportUnlocked}
          reportLoading={reportLoading}
          error={error}
          name={leadName}
          nameInput={nameInput}
          setNameInput={setNameInput}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          onUnlock={unlockReport}
        />
      )}
    </main>
  );
}


function Interview({
  index,
  total,
  question,
  answer,
  setAnswer,
  onSubmit,
  loading,
  error,
  onRetry,
}: {
  index: number;
  total: number;
  question: string;
  answer: string;
  setAnswer: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const progress = ((index - 1) / total) * 100;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-sans text-xs uppercase tracking-[0.25em] text-foreground/40">
            Question {index} of {total}
          </span>
          <span className="font-sans text-xs text-foreground/30">{Math.round(progress)}%</span>
        </div>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error ? (
        <div className="text-center">
          <p className="mb-4 text-foreground/70">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-full border border-accent px-6 py-2 font-sans text-sm text-accent"
          >
            Try again
          </button>
        </div>
      ) : loading && !question ? (
        <p className="animate-pulse text-center text-foreground/50">Thinking…</p>
      ) : (
        <>
          <h2 className="mb-8 min-h-[3em] font-serif text-2xl leading-relaxed sm:text-3xl">
            {question}
          </h2>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
            }}
            rows={4}
            autoFocus
            placeholder="Take your time…"
            className="w-full resize-none rounded-xl border border-foreground/15 bg-foreground/5 p-4 font-sans text-base text-foreground outline-none transition focus:border-accent"
          />
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={onSubmit}
              disabled={!answer.trim() || loading}
              className="rounded-full bg-accent px-7 py-2.5 font-sans text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {loading ? "…" : index >= total ? "Finish" : "Next →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Reflecting() {
  return (
    <div className="text-center">
      <p className="mb-4 animate-pulse font-serif text-2xl text-foreground/80">
        Analysing your answers…
      </p>
      <p className="font-sans text-sm text-foreground/50">
        Building your diagnostic report.
      </p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const colour = getScoreColour(score);
  const scoreLabel = getScoreLabel(score);
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-sans text-sm text-foreground/70">{label}</span>
        <span className="font-sans text-xs font-semibold" style={{ color: colour }}>
          {score}/100 · {scoreLabel}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

function Result({
  insight,
  report,
  reportUnlocked,
  reportLoading,
  error,
  name,
  nameInput,
  setNameInput,
  emailInput,
  setEmailInput,
  onUnlock,
}: {
  insight: InsightResult | null;
  report: string;
  reportUnlocked: boolean;
  reportLoading: boolean;
  error: string;
  name: string;
  nameInput: string;
  setNameInput: (v: string) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  onUnlock: () => void;
}) {
  if (error && !insight) {
    return (
      <div className="text-center">
        <p className="text-foreground/70">{error}</p>
      </div>
    );
  }

  if (insight?.trolled) {
    return (
      <div className="text-center">
        <p className="font-serif text-xl text-foreground/70">
          Looks like you weren&apos;t really here for this one — and that&apos;s fine. Come back when you&apos;re ready.
        </p>
      </div>
    );
  }

  if (!insight) return null;

  const primary = ARCHETYPES[insight.primaryArchetype];
  const secondary = ARCHETYPES[insight.secondaryArchetype];
  const scoreColour = getScoreColour(insight.overallScore);
  const firstName = name.split(" ")[0] || "You";

  return (
    <div>
      {/* Score reveal */}
      <div className="mb-10 text-center">
        <p className="mb-2 font-sans text-xs uppercase tracking-[0.35em] text-foreground/40">
          Soul Audit Score
        </p>
        <div
          className="mb-1 font-serif text-8xl font-light leading-none"
          style={{ color: scoreColour }}
        >
          {insight.overallScore}
        </div>
        <p className="font-sans text-sm text-foreground/40">out of 100</p>
        <p className="mt-4 font-sans text-sm text-foreground/60 max-w-sm mx-auto">
          {firstName}, your results suggest you are currently operating significantly below your potential — held back by patterns you may not have fully named yet.
        </p>
      </div>

      {/* Sub-score breakdown */}
      <div className="mb-10 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6">
        <p className="mb-5 font-sans text-xs uppercase tracking-[0.3em] text-foreground/40">
          Score Breakdown
        </p>
        <ScoreBar label="Identity" score={insight.subScores.identity} />
        <ScoreBar label="Self-Trust" score={insight.subScores.selfTrust} />
        <ScoreBar label="Emotional Control" score={insight.subScores.emotionalControl} />
        <ScoreBar label="Consistency" score={insight.subScores.consistency} />
        <ScoreBar label="Action Taking" score={insight.subScores.actionTaking} />
      </div>

      {/* Primary archetype */}
      <div className="mb-6 rounded-2xl border p-6" style={{ borderColor: primary.colour + "40" }}>
        <p className="mb-2 font-sans text-xs uppercase tracking-[0.3em]" style={{ color: primary.colour }}>
          Dominant Pattern
        </p>
        <h2 className="mb-3 font-serif text-3xl" style={{ color: primary.colour }}>
          {primary.label}
        </h2>
        <p className="mb-2 font-sans text-sm font-medium text-foreground/80">
          &ldquo;{primary.tagline}&rdquo;
        </p>
        <p className="font-sans text-sm text-foreground/60 leading-relaxed">
          {primary.description}
        </p>
      </div>

      {/* Secondary archetype */}
      <div className="mb-10 rounded-2xl border border-foreground/10 p-5">
        <p className="mb-1.5 font-sans text-xs uppercase tracking-[0.3em] text-foreground/40">
          Secondary Pattern
        </p>
        <h3
          className="mb-2 font-serif text-xl"
          style={{ color: secondary.colour }}
        >
          {secondary.label}
        </h3>
        <p className="font-sans text-sm text-foreground/55 leading-relaxed">
          {secondary.description}
        </p>
      </div>

      {/* Unlock gate */}
      {!reportUnlocked ? (
        <div className="mb-10 rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
          <p className="mb-2 font-sans text-xs uppercase tracking-[0.3em] text-accent">
            Full Diagnostic Report
          </p>
          <h3 className="mb-3 font-serif text-2xl text-foreground">
            What&apos;s really driving this pattern?
          </h3>
          <p className="mb-6 font-sans text-sm text-foreground/60 max-w-sm mx-auto leading-relaxed">
            Enter your email to unlock your full report — what your answers revealed, the hidden pattern underneath, and your honest next step.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your first name"
              autoFocus
              className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-4 py-3 font-sans text-base text-foreground outline-none transition focus:border-accent text-center"
            />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onUnlock(); }}
              placeholder="Your email address"
              className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-4 py-3 font-sans text-base text-foreground outline-none transition focus:border-accent text-center"
            />
            <button
              onClick={onUnlock}
              disabled={reportLoading || !emailInput.trim() || !nameInput.trim()}
              className="rounded-full bg-accent px-8 py-3 font-sans text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {reportLoading ? "Generating your report…" : "Unlock my full report →"}
            </button>
          </div>
          <p className="mt-3 font-sans text-xs text-foreground/30">No spam. Unsubscribe any time.</p>
        </div>
      ) : (
        <div className="mb-10">
          <p className="mb-5 font-sans text-xs uppercase tracking-[0.3em] text-accent">
            Your Full Report
          </p>
          <div className="space-y-4 font-serif text-lg leading-relaxed text-foreground/90">
            {report
              ? report.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)
              : <p>Your report has been sent to your email. Read it slowly when you have a quiet moment.</p>
            }
          </div>
        </div>

        {/* CTA — only shown after report unlocks */}
        <div className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/5 p-6 text-center">
          <p className="mb-1 font-sans text-xs uppercase tracking-[0.25em] text-accent">
            Ready to break the cycle?
          </p>
          <h3 className="mb-2 font-serif text-xl">Work with me directly</h3>
          <p className="mb-5 font-sans text-sm text-foreground/60 max-w-sm mx-auto leading-relaxed">
            DM me <span className="font-semibold text-accent">REBUILD</span> on Instagram and I&apos;ll send you a personalised voicenote based on your results.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-accent px-8 py-3 font-sans text-sm font-semibold text-background transition hover:opacity-90"
          >
            DM REBUILD on Instagram →
          </a>
        </div>
      </div>
      )}

    </div>
  );
}
