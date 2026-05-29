"use client";

import { useState } from "react";

type Exchange = { question: string; answer: string };
type Stage = "intro" | "interview" | "reflecting" | "result";

const TOTAL = 10;
// Set NEXT_PUBLIC_CALENDLY_URL in Vercel to Zak's booking link.
const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || "";

export default function Home() {
  const [stage, setStage] = useState<Stage>("intro");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [teaser, setTeaser] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function start() {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setTeaser(data.teaser);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("result");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      {stage === "intro" && <Intro onStart={start} loading={loading} />}

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
        <Result teaser={teaser} history={history} error={error} />
      )}
    </main>
  );
}

function Intro({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <div className="text-center">
      <p className="mb-4 text-sm uppercase tracking-[0.3em] text-accent">
        The Viking Christian
      </p>
      <h1 className="mb-6 font-serif text-4xl leading-tight sm:text-5xl">
        Ten questions to reveal something about yourself you don&apos;t yet know.
      </h1>
      <p className="mx-auto mb-10 max-w-md text-lg text-foreground/70">
        I&apos;ll ask you one question at a time. Don&apos;t overthink it — answer
        honestly, and let&apos;s see what surfaces.
      </p>
      <button
        onClick={onStart}
        disabled={loading}
        className="rounded-full bg-accent px-8 py-3 font-sans text-base font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Beginning…" : "Begin"}
      </button>
    </div>
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
  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-foreground/15" />
        <span className="font-sans text-xs uppercase tracking-[0.25em] text-foreground/50">
          {index} of {total}
        </span>
        <div className="h-px flex-1 bg-foreground/15" />
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
          <div className="mt-4 flex items-center justify-between">
            <span className="font-sans text-xs text-foreground/40">
              ⌘ + Enter to continue
            </span>
            <button
              onClick={onSubmit}
              disabled={!answer.trim() || loading}
              className="rounded-full bg-accent px-7 py-2.5 font-sans text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
            >
              {loading ? "…" : index >= total ? "Finish" : "Next"}
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
        Reflecting on your answers…
      </p>
      <p className="font-sans text-sm text-foreground/50">
        This takes a moment.
      </p>
    </div>
  );
}

function Result({
  teaser,
  history,
  error,
}: {
  teaser: string;
  history: Exchange[];
  error: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [reflection, setReflection] = useState("");

  async function submitLead() {
    if (submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setReflection(data.reflection || "");
      setSent(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm uppercase tracking-[0.3em] text-accent">
        {sent ? "Your full reflection" : "What I saw"}
      </p>

      {error ? (
        <p className="mb-8 text-foreground/70">{error}</p>
      ) : sent ? (
        // After signup: show the full reflection (or a graceful fallback),
        // then the Calendly call-to-action.
        <>
          <div className="space-y-4 font-serif text-lg leading-relaxed text-foreground/90">
            {reflection ? (
              reflection
                .split("\n")
                .filter(Boolean)
                .map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>
                Thank you — your reflection is on its way to your inbox. Read it
                slowly when you have a quiet moment.
              </p>
            )}
          </div>

          {CALENDLY_URL && (
            <div className="mt-10 rounded-2xl border border-accent/40 bg-accent/5 p-6 text-center">
              <h3 className="mb-2 font-serif text-xl">
                Want to take this further, together?
              </h3>
              <p className="mb-5 font-sans text-sm text-foreground/60">
                If something here struck a nerve, let&apos;s talk. Book a free
                conversation with me and we&apos;ll go deeper.
              </p>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-accent px-8 py-3 font-sans text-sm font-semibold text-background transition hover:opacity-90"
              >
                Book a call with Zak
              </a>
            </div>
          )}
        </>
      ) : (
        // Before signup: show only the intriguing teaser, then the gate.
        <>
          <div className="mb-10 space-y-4 font-serif text-xl leading-relaxed text-foreground/90">
            {teaser.split("\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="rounded-2xl border border-foreground/15 bg-foreground/5 p-6">
            <h3 className="mb-2 font-serif text-xl">
              There&apos;s something I want to show you.
            </h3>
            <p className="mb-5 font-sans text-sm text-foreground/60">
              Leave your email and I&apos;ll reveal the full reflection — what
              your answers quietly pointed to, and where to go from here.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-lg border border-foreground/15 bg-background/40 px-4 py-3 font-sans text-sm outline-none focus:border-accent"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg border border-foreground/15 bg-background/40 px-4 py-3 font-sans text-sm outline-none focus:border-accent"
              />
              {formError && (
                <p className="font-sans text-sm text-red-400">{formError}</p>
              )}
              <button
                onClick={submitLead}
                disabled={submitting}
                className="rounded-full bg-accent px-7 py-3 font-sans text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Revealing…" : "Reveal my reflection"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
