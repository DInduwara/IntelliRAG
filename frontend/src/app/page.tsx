"use client";

import { useMemo, useState } from "react";
import { askQuestion } from "@/lib/api";
import type { QAResponse, CitationsMap } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";

function extractCitationIds(answer: string): string[] {
  // Matches [C1], [P7-C1], [P7-C12], etc.
  const re = /\[([^\[\]\n]{1,40})\]/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    ids.push(m[1]);
  }
  // Unique, keep order
  return Array.from(new Set(ids));
}

function formatPageLabel(item?: { page?: string | number; page_label?: string | number }) {
  if (!item) return "unknown";
  const pl = item.page_label ?? item.page;
  return pl === undefined || pl === null || pl === "" ? "unknown" : String(pl);
}

function formatSource(source?: string) {
  if (!source) return "unknown";
  // Keep it readable: show filename if it's a path
  const parts = source.split(/[/\\]/);
  return parts[parts.length - 1] || source;
}

function scrollToEvidence(id: string) {
  const el = document.getElementById(`evidence-${CSS.escape(id)}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Page() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QAResponse | null>(null);
  const [showContext, setShowContext] = useState(false);

  const canAsk = useMemo(
    () => question.trim().length > 2 && !loading,
    [question, loading]
  );

  const citationIds = useMemo(() => {
    if (!data?.answer) return [];
    return extractCitationIds(data.answer);
  }, [data?.answer]);

  const citations: CitationsMap = data?.citations ?? {};

  async function onAsk() {
    setError(null);
    setData(null);
    setShowContext(false);

    try {
      setLoading(true);
      const res = await askQuestion({ question: question.trim() });
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
                {loading ? "Asking..." : "Ask"}
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
              {loading ? <Spinner label="Calling /qa..." /> : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {data?.answer ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-400">Citations detected</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {citationIds.length ? (
                    citationIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => scrollToEvidence(id)}
                        className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                        title="Jump to evidence"
                      >
                        [{id}]
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400">
                      No citations found in answer text.
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
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
                    {data.context}
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
              {data?.answer ? (
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">{data.answer}</p>
                </div>
              ) : (
                <div className="text-sm text-zinc-400">
                  No answer yet. Ask a question to see results here.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Evidence"
              subtitle="Citations map returned by the backend (chunk_id → page/source/snippet)."
              right={
                data?.citations ? (
                  <div className="text-xs text-zinc-400">
                    Total:{" "}
                    <span className="text-zinc-200 font-semibold">
                      {Object.keys(data.citations).length}
                    </span>
                  </div>
                ) : null
              }
            />
            <CardBody>
              {data?.citations && Object.keys(data.citations).length ? (
                <div className="grid gap-3">
                  {Object.entries(citations).map(([id, meta]) => (
                    <div
                      key={id}
                      id={`evidence-${id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-zinc-100">
                          [{id}]
                        </div>
                        <div className="text-xs text-zinc-400">
                          Page{" "}
                          <span className="text-zinc-200 font-semibold">
                            {formatPageLabel(meta)}
                          </span>{" "}
                          •{" "}
                          <span className="text-zinc-200 font-semibold">
                            {formatSource(meta.source)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-100/90">
                        {meta.snippet ?? "(no snippet provided)"}
                      </p>
                    </div>
                  ))}
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
