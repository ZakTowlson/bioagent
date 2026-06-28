"use client";

import { useState } from "react";

type Exchange = { question: string; answer: string };
type Tags = { theme?: string; readiness?: string } | null;
type Stage = "intro" | "capture" | "interview" | "reflecting" | "result";

const TOTAL = 10;
const INSTAGRAM_URL = "https://www.instagram.com/thevikingchristian/";

export default function Home() {
  const [stage, setStage] = useState<Stage>("intro");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [reflection, setReflection] = useState("");
  const [tags, setTags] = useState<Tags>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [archetype] = useState("");
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
        body: JSON.stringify({ history: current, archetype }),
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
      await fetchResult(updated);
    } else {
      await fetchQuestion(updated);
    }
  }

  async function fetchResult(final: Exchange[]) {
    setStage("reflecting");
    setError("");
    try {
      const [insightRes, leadRes] = await Promise.all([
        fetch("/api/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: final, archetype }),
        }),
        fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: leadName, email: leadEmail, history: final, archetype, tags }),
        }),
      ]);
      const insightData = await insightRes.json();
      const leadData = await leadRes.json();
      if (insightData.trolled) {
        setReflection(insightData.teaser);
      } else {
        setReflection(leadData.reflection || insightData.teaser || "");
      }
      setTags(insightData.tags ?? null);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("result");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      {stage === "intro" && <Intro onStart={() => setStage("capture")} />}

      {stage === "capture" && (
        <Capture
          name={leadName}
          email={leadEmail}
          setName={setLeadName}
          setEmail={setLeadEmail}
          onSubmit={startInterview}
        />
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
        <Result reflection={reflection} error={error} name={leadName} />
      )}
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/soul-ark-logo.png" alt="Soul Ark" className="mx-auto mb-3 h-14 w-14 object-contain" />
      <p className="mb-6 text-sm uppercase tracking-[0.3em] text-accent">
        By The Viking Christian
      </p>
      <h1 className="mb-4 font-serif text-5xl leading-none sm:text-6xl">
        The Soul Audit
      </h1>
      <p className="mb-6 font-serif text-xl text-foreground/90 sm:text-2xl">
        10 questions to uncover what&apos;s really holding you back.
      </p>
      <p className="mx-auto mb-10 max-w-md text-base text-foreground/60">
        Answer honestly — it only works if you do.
      </p>
      <button
        onClick={onStart}
        className="rounded-full bg-accent px-8 py-3 font-sans text-base font-semibold text-background transition hover:opacity-90"
      >
        Begin
      </button>
    </div>
  );
}

function Capture({
  name,
  email,
  setName,
  setEmail,
  onSubmit,
}: {
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  onSubmit: () => void;
}) {
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email."); return; }
    onSubmit();
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-3 text-center text-sm uppercase tracking-[0.3em] text-accent">
        Before we start
      </p>
      <h2 className="mb-2 text-center font-serif text-2xl leading-snug sm:text-3xl">
        Where should I send your results?
      </h2>
      <p className="mb-8 text-center font-sans text-sm text-foreground/50">
        I&apos;ll email you a copy of your personal reflection when we&apos;re done.
      </p>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-4 py-3 font-sans text-base text-foreground outline-none transition focus:border-accent"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-4 py-3 font-sans text-base text-foreground outline-none transition focus:border-accent"
        />
        {error && <p className="font-sans text-sm text-red-400">{error}</p>}
        <button
          onClick={handleSubmit}
          className="rounded-full bg-accent px-7 py-3 font-sans text-sm font-semibold text-background transition hover:opacity-90"
        >
          Start the audit →
        </button>
      </div>
      <p className="mt-4 text-center font-sans text-xs text-foreground/30">
        No spam. Unsubscribe any time.
      </p>
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
  reflection,
  error,
  name,
}: {
  reflection: string;
  error: string;
  name: string;
}) {
  return (
    <div>
      <p className="mb-4 text-sm uppercase tracking-[0.3em] text-accent">
        Your reflection
      </p>

      {error ? (
        <p className="mb-8 text-foreground/70">{error}</p>
      ) : (
        <>
          <div className="mb-12 space-y-4 font-serif text-lg leading-relaxed text-foreground/90">
            {reflection
              ? reflection.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)
              : <p>Your reflection has been sent to your email. Read it slowly when you have a quiet moment.</p>
            }
          </div>

          {/* Masterclass placeholder — replace YOUTUBE_URL when ready */}
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
            <p className="mb-2 font-sans text-xs uppercase tracking-[0.25em] text-accent">
              Want to go deeper?
            </p>
            <h3 className="mb-3 font-serif text-2xl">
              Your Free Masterclass
            </h3>
            <p className="mb-6 font-sans text-sm text-foreground/60">
              Everything you need to understand your mindset, take control of your emotions, and start becoming who you were built to be — completely free.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-accent px-8 py-3 font-sans text-sm font-semibold text-background transition hover:opacity-90"
            >
              Coming soon — follow for the release
            </a>
          </div>

          <div className="mt-8 text-center">
            <p className="mb-3 font-sans text-sm text-foreground/50">
              Ready to go further? DM <span className="text-accent font-semibold">REBUILD</span> on Instagram.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full border border-accent/40 px-6 py-2 font-sans text-sm text-accent transition hover:border-accent"
            >
              @thevikingchristian →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
