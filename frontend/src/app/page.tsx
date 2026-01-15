"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { askQuestion } from "@/lib/api";
import type { QAResponse, CitationsMap } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";

function extractCitationIds(answer: string): string[] {
  const re = /\[([^\[\]\n]{1,40})\]/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) ids.push(m[1]);
  return Array.from(new Set(ids));
}

function formatPageLabel(item?: { page?: string | number; page_label?: string | number }) {
  if (!item) return "unknown";
  const pl = item.page_label ?? item.page;
  return pl === undefined || pl === null || pl === "" ? "unknown" : String(pl);
}

function formatSource(source?: string) {
  if (!source) return "unknown";
  const parts = source.split(/[/\\]/);
  return parts[parts.length - 1] || source;
}

function evidenceElementId(citationId: string) {
  return `evidence-${encodeURIComponent(citationId)}`;
}

function badgeClass(conf: QAResponse["confidence"] | undefined) {
  if (conf === "high") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (conf === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-red-500/30 bg-red-500/10 text-red-100";
}

export default function Page() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QAResponse | null>(null);

  const [showContext, setShowContext] = useState(false);

  // Default: showOnlyCited = true, but if answer has no citations, auto show all evidence
  const [showOnlyCited, setShowOnlyCited] = useState(true);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const canAsk = useMemo(() => question.trim().length > 2 && !loading, [question, loading]);

  const citations: CitationsMap = data?.citations ?? {};

  const citationIds = useMemo(() => {
    if (!data?.answer) return [];
    return extractCitationIds(data.answer);
  }, [data?.answer]);

  const citedSet = useMemo(() => new Set(citationIds), [citationIds]);

  const hasAnswer = Boolean(data?.answer);
  const hasCitations = Boolean(data?.citations && Object.keys(data.citations).length);

  // If answer has 0 citation tokens, showing "only cited" becomes useless.
  // Force evidence list to show all in that case.
  const effectiveShowOnlyCited = showOnlyCited && citationIds.length > 0;

  const evidenceEntries = useMemo(() => {
    const entries = Object.entries(citations);
    if (!entries.length) return [];
    if (!effectiveShowOnlyCited) return entries;
    return entries.filter(([id]) => citedSet.has(id));
  }, [citations, effectiveShowOnlyCited, citedSet]);

  function jumpToEvidence(id: string) {
    const el = document.getElementById(evidenceElementId(id));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightId(id);
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1200);
    }
  }

  useEffect(() => {
    return () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    };
  }, []);

  async function onAsk() {
    setError(null);
    setData(null);
    setShowContext(false);
    setHighlightId(null);

    try {
      setLoading(true);
      setAsking(true);
      const res = await askQuestion({ question: question.trim() });
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setAsking(false);
      setLoading(false);
    }
  }

  const filteredCount = evidenceEntries.length;
  const totalCount = hasCitations ? Object.keys(citations).length : 0;

  const confidence = data?.confidence ?? "low";
  const confidenceHint =
    confidence === "low"
      ? "Low confidence usually means the answer has weak or missing citations from the indexed document."
      : null;

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ask IntelliRAG</h1>
          <p className="mt-2 text-zinc-300/80">
            Ask questions after indexing your PDF. Answers include evidence citations you can inspect.
          </p>
        </div>
        <div className="hidden sm:block text-xs text-zinc-400">
          Backend: <span className="text-zinc-200 font-semibold">/qa</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-[84px] lg:self-start">
          <CardHeader
            title="Question"
            subtitle="Type a question and submit. Make sure your backend is running."
            right={
              <Button onClick={onAsk} disabled={!canAsk}>
                {asking ? "Asking..." : "Ask"}
              </Button>
            }
          />
          <CardBody>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What are the main indexing strategies in vector databases?"
              className="min-h-[160px] w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm
                         placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Tip: Index a PDF first in <span className="font-semibold text-zinc-200">Upload PDF</span>.
              </div>
              {asking ? <Spinner label="Calling /qa..." /> : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {hasAnswer ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-400">Citations detected</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {citationIds.length
                        ? `${citationIds.length} citation(s) found in the answer text.`
                        : "No citations found in answer text."}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`rounded-xl border px-3 py-1 text-xs font-semibold ${badgeClass(confidence)}`}>
                      Confidence: {confidence}
                    </div>

                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                      onClick={() => setShowOnlyCited((v) => !v)}
                      disabled={!hasCitations}
                      title="Filter evidence cards"
                    >
                      {effectiveShowOnlyCited ? "Showing: cited" : "Showing: all"}
                    </button>
                  </div>
                </div>

                {confidenceHint ? (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
                    {confidenceHint}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {citationIds.length ? (
                    citationIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => jumpToEvidence(id)}
                        className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                        title="Jump to evidence"
                      >
                        [{id}]
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400">
                      Your prompts require citations. If none appear, the verification agent likely removed them or the answer is unsupported.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowContext((v) => !v)}
                    className="text-xs font-semibold text-zinc-200 hover:underline"
                  >
                    {showContext ? "Hide raw context" : "Show raw context"}
                  </button>
                  <span className="text-xs text-zinc-500">for debugging</span>
                </div>

                {showContext ? (
                  <pre className="mt-3 max-h-[240px] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/40 p-3 text-xs text-zinc-200/90 whitespace-pre-wrap">
                    {data?.context}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader title="Answer" subtitle="The assistant response returned by your API." />
            <CardBody>
              {hasAnswer ? (
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">{data?.answer}</p>
                </div>
              ) : (
                <div className="text-sm text-zinc-400">No answer yet. Ask a question to see results here.</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Evidence"
              subtitle="Citations map returned by the backend (chunk_id → page/source/snippet)."
              right={
                hasCitations ? (
                  <div className="text-xs text-zinc-400">
                    Showing <span className="text-zinc-200 font-semibold">{filteredCount}</span> /{" "}
                    <span className="text-zinc-200 font-semibold">{totalCount}</span>
                  </div>
                ) : null
              }
            />
            <CardBody>
              {hasCitations ? (
                <div className="grid gap-3">
                  {evidenceEntries.map(([id, meta]) => {
                    const isCited = citedSet.has(id);
                    const isHighlighted = highlightId === id;

                    return (
                      <div
                        key={id}
                        id={evidenceElementId(id)}
                        className={[
                          "rounded-2xl border p-4 transition",
                          isHighlighted
                            ? "border-white/40 bg-white/10 ring-2 ring-white/20"
                            : isCited
                              ? "border-white/15 bg-white/5"
                              : "border-white/10 bg-white/5",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-100">[{id}]</div>
                            {isCited ? (
                              <span className="rounded-full border border-white/10 bg-zinc-950/40 px-2 py-0.5 text-[11px] font-semibold text-zinc-200">
                                cited
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-zinc-400">
                            Page <span className="text-zinc-200 font-semibold">{formatPageLabel(meta)}</span> •{" "}
                            <span className="text-zinc-200 font-semibold">{formatSource(meta.source)}</span>
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-100/90">
                          {meta.snippet ?? "(no snippet provided)"}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-xs text-zinc-500">
                            Source: <span className="text-zinc-300">{formatSource(meta.source)}</span>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-zinc-200 hover:underline"
                            onClick={() => {
                              navigator.clipboard?.writeText(`[${id}]`).catch(() => {});
                            }}
                            title="Copy citation token"
                          >
                            Copy [{id}]
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-zinc-400">No citations returned yet. Ask a question after indexing a PDF.</div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
