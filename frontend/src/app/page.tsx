"use client";

/**
 * Ask page
 * - Calls POST /qa
 * - Renders answer with inline citation tokens (clickable)
 * - Renders evidence panel from `citations` map
 * - Shows confidence signal returned by backend
 *
 * Notes:
 * - This page assumes the backend returns: { answer, context, citations?, confidence? }
 * - Citations in the answer must be formatted like: [P7-C1] or similar.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { askQuestion } from "@/lib/api";
import type { QAResponse, CitationsMap } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { CitationTag } from "@/components/CitationTag";
import { extractCitationIds, tokenizeAnswer } from "@/lib/citations";

/**
 * Prefer page_label for user-facing display because PDF labels are often 1-based,
 * whereas internal `page` could be 0-based depending on the loader.
 */
function formatPageLabel(item?: { page?: string | number; page_label?: string | number }) {
  if (!item) return "unknown";
  const pl = item.page_label ?? item.page;
  return pl === undefined || pl === null || pl === "" ? "unknown" : String(pl);
}

/**
 * Show a readable filename even if the backend provides a full path.
 */
function formatSource(source?: string) {
  if (!source) return "unknown";
  const parts = source.split(/[/\\]/);
  return parts[parts.length - 1] || source;
}

/**
 * Generate stable DOM id for evidence sections.
 * encodeURIComponent prevents broken IDs when citations include special characters.
 */
function evidenceElementId(citationId: string) {
  return `evidence-${encodeURIComponent(citationId)}`;
}

export default function Page() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QAResponse | null>(null);

  // Debugging toggles
  const [showContext, setShowContext] = useState(false);

  // Evidence display preference
  const [showOnlyCited, setShowOnlyCited] = useState(true);

  // Evidence highlight control after jump
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const canAsk = useMemo(() => question.trim().length > 2 && !loading, [question, loading]);

  const citations: CitationsMap = data?.citations ?? {};

  /**
   * Extract citation IDs referenced in the answer text.
   * These IDs should exist in `citations` map if the backend is consistent.
   */
  const citationIds = useMemo(() => {
    if (!data?.answer) return [];
    return extractCitationIds(data.answer);
  }, [data?.answer]);

  const citedSet = useMemo(() => new Set(citationIds), [citationIds]);

  /**
   * Evidence entries shown in the UI.
   * Default: show only evidence that is actually cited in the answer.
   */
  const evidenceEntries = useMemo(() => {
    const entries = Object.entries(citations);
    if (!entries.length) return [];
    if (!showOnlyCited) return entries;
    return entries.filter(([id]) => citedSet.has(id));
  }, [citations, showOnlyCited, citedSet]);

  /**
   * Scroll to evidence card and briefly highlight it.
   */
  function jumpToEvidence(id: string) {
    const el = document.getElementById(evidenceElementId(id));
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "start" });

    setHighlightId(id);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1200);
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
      const msg = e instanceof Error ? e.message : "Request failed.";
      setError(msg);
    } finally {
      setAsking(false);
      setLoading(false);
    }
  }

  const hasAnswer = Boolean(data?.answer);
  const hasCitations = Boolean(data?.citations && Object.keys(data.citations).length);

  const filteredCount = evidenceEntries.length;
  const totalCount = hasCitations ? Object.keys(citations).length : 0;

  /**
   * Confidence is computed in the backend using citation coverage.
   * - high: multiple valid citations used
   * - medium: one valid citation used
   * - low: no valid citations used
   */
  const confidence = data?.confidence ?? "low";
  const confidenceTone =
    confidence === "high"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : confidence === "medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : "border-red-500/30 bg-red-500/10 text-red-100";

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ask IntelliRAG</h1>
          <p className="mt-2 text-zinc-300/80">
            Ask questions after indexing your PDF. Citations are interactive and map to chunk-level evidence.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: question, controls, summary */}
        <Card className="lg:sticky lg:top-21 lg:self-start">
          <CardHeader
            title="Question"
            subtitle="Submit a question. Ensure the FastAPI backend is running and reachable."
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
              placeholder="Example: What indexing strategies are described for vector databases?"
              className="min-h-40 w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm
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
                    <div className="text-xs text-zinc-400">Citations referenced in answer</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {citationIds.length
                        ? `${citationIds.length} citation token(s) found in the answer text.`
                        : "No citation tokens found in the answer text."}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-xl border px-3 py-1 text-xs font-semibold ${confidenceTone}`}
                      title="Confidence is computed from valid citation coverage in the final answer."
                    >
                      Confidence: {confidence}
                    </div>

                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                      onClick={() => setShowOnlyCited((v) => !v)}
                      disabled={!hasCitations}
                      title="Filter evidence cards"
                    >
                      {showOnlyCited ? "Showing: cited" : "Showing: all"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {citationIds.length ? (
                    citationIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => jumpToEvidence(id)}
                        className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                        title="Jump to evidence card"
                      >
                        [{id}]
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400">
                      If no citations appear, the document may not contain the answer or the prompt rules are not being followed.
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
                  <span className="text-xs text-zinc-500">debugging only</span>
                </div>

                {showContext ? (
                  <pre className="mt-3 max-h-60 overflow-auto rounded-2xl border border-white/10 bg-zinc-950/40 p-3 text-xs text-zinc-200/90 whitespace-pre-wrap">
                    {data?.context}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Right column: answer + evidence */}
        <div className="grid gap-6">
          <Card>
            <CardHeader title="Generated answer" subtitle="Citations are clickable and linked to evidence." />
            <CardBody>
              {hasAnswer ? (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {tokenizeAnswer(data?.answer ?? "").map((t, i) =>
                      t.type === "text" ? (
                        <span key={i}>{t.value}</span>
                      ) : (
                        <CitationTag
                          key={`${t.id}-${i}`}
                          id={t.id}
                          citations={citations}
                          onClick={jumpToEvidence}
                        />
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-400">No answer yet. Submit a question to see results.</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Evidence"
              subtitle="Chunk citations"
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
                            Page{" "}
                            <span className="text-zinc-200 font-semibold">{formatPageLabel(meta)}</span> •{" "}
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
                <div className="text-sm text-zinc-400">
                  No citations returned yet. Ask a question after indexing a PDF.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
