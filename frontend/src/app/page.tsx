"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { askQuestion } from "@/lib/api";
import type { QAResponse, CitationsMap } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { CitationTag } from "@/components/CitationTag";
import { extractCitationIds, tokenizeAnswer } from "@/lib/citations";
import { QueryPlan } from "@/components/QueryPlan";

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

// UPDATE: Added 'index' so citation IDs are unique per chat message
function evidenceElementId(citationId: string, index: number) {
  return `evidence-${index}-${encodeURIComponent(citationId)}`;
}

export default function Page() {
  const [question, setQuestion] = useState("");
  
  // NEW: Generate a unique thread ID for backend memory persistence
  const [threadId] = useState(() => crypto.randomUUID());

  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: Array to store the conversation flow
  const [chatHistory, setChatHistory] = useState<Array<{
    q: string;
    r: QAResponse;
  }>>([]);

  const [showOnlyCited, setShowOnlyCited] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  
  const highlightTimer = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = window.localStorage.getItem("intelirag:lastUploadedPdf");
    setLastUploaded(v || null);
  }, []);

  // NEW: Auto-scroll to the bottom when a new message arrives or loading starts
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chatHistory, loading]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    };
  }, []);

  const canAsk = useMemo(() => question.trim().length > 2 && !loading, [question, loading]);

  // UPDATE: Requires message index to jump to the correct evidence card in the list
  function jumpToEvidence(id: string, messageIndex: number) {
    const el = document.getElementById(evidenceElementId(id, messageIndex));
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    setHighlightId(`${messageIndex}-${id}`);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1200);
  }

  async function onAsk() {
    setError(null);

    const document_scope = scopeMode === "selected" ? lastUploaded : null;

    if (scopeMode === "selected" && !lastUploaded) {
      setError("No selected PDF found. Upload a PDF first.");
      return;
    }

    try {
      setLoading(true);

      const res = await askQuestion({
        question: question.trim(),
        document_scope,
        thread_id: threadId, // Pass the memory thread ID
      });

      // Append new interaction to history
      setChatHistory((prev) => [...prev, { q: question.trim(), r: res }]);
      setQuestion(""); // Clear input for next question
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed.";
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
            Stateful conversation. The assistant remembers context across follow-up questions.
          </p>
        </div>
      </div>

      {/* CHAT HISTORY FEED */}
      <div className="flex flex-col gap-12 pb-8">
        {chatHistory.length === 0 && !loading && (
          <div className="text-center text-zinc-500 py-12 border border-white/5 border-dashed rounded-3xl">
            No messages yet. Ask a question below to start the conversation!
          </div>
        )}

        {chatHistory.map((item, index) => {
          const data = item.r;
          const citations: CitationsMap = data.citations ?? {};
          const citationIds = extractCitationIds(data.answer);
          const citedSet = new Set(citationIds);
          
          const evidenceEntries = Object.entries(citations).filter(([id]) => 
            !showOnlyCited || citedSet.has(id)
          );

          const hasPlan = Boolean(data.plan || (data.sub_questions && data.sub_questions.length > 0));
          const confidence = data.confidence ?? "low";
          const confidenceTone =
            confidence === "high"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : confidence === "medium"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
              : "border-red-500/30 bg-red-500/10 text-red-100";

          return (
            <div key={index} className="grid gap-6 lg:grid-cols-2 bg-zinc-950/20 p-6 rounded-3xl border border-white/5">
              
              {/* LEFT COLUMN: User Question & Evidence */}
              <div className="flex flex-col gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">You Asked</div>
                  <div className="text-zinc-100 font-medium text-lg">{item.q}</div>
                </div>

                <Card>
                  <CardHeader 
                    title="Evidence" 
                    subtitle="Chunk citations for this answer"
                    right={
                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                        onClick={() => setShowOnlyCited((v) => !v)}
                        title="Filter evidence cards"
                      >
                        {showOnlyCited ? "Showing: cited" : "Showing: all"}
                      </button>
                    }
                  />
                  <CardBody>
                    <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                      {evidenceEntries.length > 0 ? (
                        evidenceEntries.map(([id, meta]) => {
                          const isCited = citedSet.has(id);
                          const isHighlighted = highlightId === `${index}-${id}`;

                          return (
                            <div
                              key={id}
                              id={evidenceElementId(id, index)}
                              className={[
                                "rounded-2xl border p-4 transition-all duration-300",
                                isHighlighted
                                  ? "border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                  : isCited
                                  ? "border-white/15 bg-white/5"
                                  : "border-white/10 bg-white/5 opacity-60",
                              ].join(" ")}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-zinc-100">[{id}]</div>
                                </div>
                                <div className="text-xs text-zinc-400">
                                  Page <span className="text-zinc-200 font-semibold">{formatPageLabel(meta)}</span>
                                </div>
                              </div>
                              <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                                {meta.snippet ?? "(no snippet provided)"}
                              </p>
                              <div className="mt-3 text-xs text-zinc-500">
                                Source: <span className="text-zinc-400">{formatSource(meta.source)}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-zinc-500 text-center py-4">No citations referenced.</div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* RIGHT COLUMN: Plan & Answer */}
              <div className="flex flex-col gap-6 lg:self-start">
                {hasPlan ? (
                  <QueryPlan plan={data.plan || ""} subQuestions={data.sub_questions || []} />
                ) : null}

                <Card>
                  <CardHeader 
                    title="Assistant Answer" 
                    right={
                      <div className={`rounded-xl border px-3 py-1 text-xs font-semibold ${confidenceTone}`}>
                        Confidence: {confidence}
                      </div>
                    }
                  />
                  <CardBody>
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                        {tokenizeAnswer(data.answer ?? "").map((t, i) =>
                          t.type === "text" ? (
                            <span key={i}>{t.value}</span>
                          ) : (
                            <CitationTag
                              key={`${t.id}-${i}`}
                              id={t.id}
                              citations={citations}
                              // Pass the correct index so it jumps to the evidence in THIS block
                              onClick={(id) => jumpToEvidence(id, index)}
                            />
                          )
                        )}
                      </div>
                    </div>
                    
                    <details className="mt-6 border-t border-white/5 pt-4">
                      <summary className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 cursor-pointer transition">
                        View Raw Context (Debug)
                      </summary>
                      <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-black/50 p-3 text-[10px] text-zinc-400 whitespace-pre-wrap">
                        {data.context}
                      </pre>
                    </details>
                  </CardBody>
                </Card>
              </div>

            </div>
          );
        })}

        {/* --- NEW: SKELETON LOADER FOR PROCESSING STATE --- */}
        {loading && (
          <div className="grid gap-6 lg:grid-cols-2 bg-zinc-950/20 p-6 rounded-3xl border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: User's Pending Question */}
            <div className="flex flex-col gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
                  <Spinner /> Sending...
                </div>
                <div className="text-zinc-100 font-medium text-lg opacity-70">{question}</div>
              </div>

              <Card>
                <CardHeader title="Evidence" subtitle="Scanning documents..." />
                <CardBody>
                  <div className="flex flex-col gap-3">
                    <div className="h-24 bg-white/5 rounded-2xl animate-pulse"></div>
                    <div className="h-24 bg-white/5 rounded-2xl animate-pulse delay-75"></div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right Column: AI Processing Blocks */}
            <div className="flex flex-col gap-6 lg:self-start">
              <div className="h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-pulse flex items-center px-4">
                <span className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Agentic Planning in progress...
                </span>
              </div>

              <Card>
                <CardHeader title="Assistant Answer" />
                <CardBody>
                  <div className="space-y-4 pt-2">
                    <div className="h-3 bg-white/10 rounded-full w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-white/10 rounded-full w-full animate-pulse delay-75"></div>
                    <div className="h-3 bg-white/10 rounded-full w-5/6 animate-pulse delay-150"></div>
                    <div className="h-3 bg-white/10 rounded-full w-4/6 animate-pulse delay-200"></div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
        {/* ----------------------------------------------- */}

        {/* Invisible div to scroll to */}
        <div ref={chatEndRef} className="h-4" /> 
      </div>

      {/* STICKY BOTTOM INPUT AREA */}
      <div className="sticky bottom-6 z-10 w-full mt-auto">
        <Card className="shadow-2xl shadow-black/50 border-white/20 bg-zinc-900/95 backdrop-blur-md">
          <CardBody>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Search Scope:</span>
              <button
                type="button"
                onClick={() => setScopeMode("all")}
                className={`rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  scopeMode === "all"
                    ? "border-white/30 bg-white/10 text-zinc-100"
                    : "border-white/5 bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                }`}
              >
                All Documents
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("selected")}
                disabled={!lastUploaded}
                className={`rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  !lastUploaded
                    ? "border-transparent bg-transparent text-zinc-700 cursor-not-allowed"
                    : scopeMode === "selected"
                    ? "border-white/30 bg-white/10 text-zinc-100"
                    : "border-white/5 bg-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                }`}
              >
                {lastUploaded ? `Selected: ${lastUploaded.slice(0, 20)}...` : "Upload PDF to focus"}
              </button>
            </div>

            <div className="relative">
              <textarea
                disabled={loading} // NEW: Disable input while waiting for backend
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canAsk) onAsk();
                  }
                }}
                placeholder={loading ? "Waiting for IntelliRAG..." : "Message IntelliRAG... (Shift+Enter for new line)"}
                className="w-full min-h-[80px] max-h-[200px] resize-y rounded-2xl border border-white/10 bg-black/40 p-4 pr-24 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all scrollbar-thin disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-3 bottom-3">
                <Button onClick={onAsk} disabled={!canAsk} className="rounded-xl px-4 py-2 shadow-lg">
                  {loading ? <Spinner /> : "Send"}
                </Button>
              </div>
            </div>

            {error ? (
              <div className="mt-3 text-xs text-red-400 font-medium">
                Error: {error}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}