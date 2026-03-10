"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { askQuestion, getMyFiles } from "@/lib/api";
import type { QAResponse, CitationsMap, FileItem } from "@/lib/types";
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

function evidenceElementId(citationId: string, index: number) {
  return `evidence-${index}-${encodeURIComponent(citationId)}`;
}

export default function Page() {
  const { getToken } = useAuth();

  const [question, setQuestion] = useState("");
  const [threadId] = useState(() => crypto.randomUUID());
  
  // FILE MANAGEMENT STATE
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [selectedScope, setSelectedScope] = useState<string | null>(null); // null = All Docs
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<Array<{
    q: string;
    r: QAResponse;
  }>>([]);

  const [showOnlyCited, setShowOnlyCited] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  
  const highlightTimer = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch user files on mount
  useEffect(() => {
    async function loadFiles() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await getMyFiles(token);
        setUserFiles(res.files);
      } catch (err) {
        console.error("Failed to load user files:", err);
      }
    }
    loadFiles();
  }, [getToken]);

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

  function jumpToEvidence(id: string, messageIndex: number) {
    const el = document.getElementById(evidenceElementId(id, messageIndex));
    if (!el) return;
    
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setHighlightId(`${messageIndex}-${id}`);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1500);
  }

  async function onAsk() {
    setError(null);

    try {
      setLoading(true);
      const token = await getToken();
      
      const res = await askQuestion({
        question: question.trim(),
        document_scope: selectedScope, 
        thread_id: threadId,
      }, token || undefined);

      setChatHistory((prev) => [...prev, { q: question.trim(), r: res }]);
      setQuestion(""); 
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen pb-40">
      {/* HEADER */}
      <div className="max-w-3xl mx-auto pt-10 px-4 mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
          IntelliRAG
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Stateful Multi-Agent Architecture
        </p>
      </div>

      {/* MAIN CHAT FEED */}
      <div className="flex flex-col max-w-3xl mx-auto px-4 w-full gap-10">
        {chatHistory.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <svg className="w-16 h-16 mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium text-zinc-300">How can I help you today?</p>
            <p className="text-sm text-zinc-500 mt-2 max-w-md">Ask a complex question, and my agents will plan a search strategy and filter noise to find the exact answer.</p>
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
          const hasTraces = Boolean(data.retrieval_traces && data.retrieval_traces.length > 0);
          const hasCritic = Boolean(data.context_rationale);
          
          const confidence = data.confidence ?? "low";

          return (
            <div key={index} className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* 1. USER MESSAGE BUBBLE */}
              <div className="flex justify-end w-full">
                <div className="bg-zinc-800 text-zinc-100 px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-[15px] shadow-sm border border-white/5">
                  {item.q}
                </div>
              </div>

              {/* 2. AI RESPONSE CONTAINER */}
              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-zinc-200">IntelliRAG</span>
                  
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${
                    confidence === "high" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                    confidence === "medium" ? "border-amber-500/30 text-amber-400 bg-amber-500/10" :
                    "border-red-500/30 text-red-400 bg-red-500/10"
                  }`}>
                    {confidence}
                  </span>
                </div>

                {/* Answer Text */}
                <div className="pl-11 prose prose-invert max-w-none">
                  <div className="text-zinc-300 leading-relaxed text-[15px]">
                    {tokenizeAnswer(data.answer ?? "").map((t, i) =>
                      t.type === "text" ? (
                        <span key={i}>{t.value}</span>
                      ) : (
                        <CitationTag
                          key={`${t.id}-${i}`}
                          id={t.id}
                          citations={citations}
                          onClick={(id) => jumpToEvidence(id, index)}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* 3. AGENT DEBUG / TRANSPARENCY ACCORDIONS */}
                <div className="pl-11 mt-2 flex flex-col gap-2">
                  {hasPlan && (
                    <details className="group rounded-xl border border-white/5 bg-white/5 overflow-hidden transition-all text-sm">
                      <summary className="cursor-pointer px-4 py-2.5 font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-2 outline-none">
                        <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Agentic Plan ({data.sub_questions?.length || 0} sub-queries)
                      </summary>
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 mt-1 bg-black/20">
                        <QueryPlan plan={data.plan || ""} subQuestions={data.sub_questions || []} />
                      </div>
                    </details>
                  )}

                  {hasTraces && (
                    <details className="group rounded-xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden transition-all text-sm">
                      <summary className="cursor-pointer px-4 py-2.5 font-medium text-indigo-300 hover:text-indigo-200 flex items-center gap-2 outline-none">
                        <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Retrieval Inspector ({data.retrieval_traces?.length} search calls)
                      </summary>
                      <div className="px-4 pb-4 pt-2 border-t border-indigo-500/10 mt-1 space-y-3 bg-black/20">
                        {data.retrieval_traces?.map((trace) => (
                          <div key={trace.call_number} className="bg-zinc-900 rounded-lg p-3 border border-white/5">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Call {trace.call_number}</div>
                            <div className="text-sm text-zinc-300 font-medium mb-2">&quot;{trace.query}&quot;</div>
                            <div className="flex gap-3 text-xs text-zinc-500">
                              <span>Found: <strong className="text-zinc-300">{trace.chunks_count}</strong></span>
                              <span>Sources: <span className="text-zinc-400">{trace.sources.join(", ") || "None"}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {hasCritic && (
                    <details className="group rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden transition-all text-sm">
                      <summary className="cursor-pointer px-4 py-2.5 font-medium text-amber-300 hover:text-amber-200 flex items-center gap-2 outline-none">
                        <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Context Critic (Noise Filter)
                      </summary>
                      <div className="px-4 pb-4 pt-2 border-t border-amber-500/10 mt-1 bg-black/20">
                        <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                          {data.context_rationale}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>

                {/* 4. HORIZONTAL EVIDENCE SOURCES */}
                {evidenceEntries.length > 0 && (
                  <div className="pl-11 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sources</span>
                      <button
                        type="button"
                        onClick={() => setShowOnlyCited((v) => !v)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        {showOnlyCited ? "Show All" : "Show Cited Only"}
                      </button>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar snap-x">
                      {evidenceEntries.map(([id, meta]) => {
                        const isHighlighted = highlightId === `${index}-${id}`;
                        const isCited = citedSet.has(id);

                        return (
                          <div
                            key={id}
                            id={evidenceElementId(id, index)}
                            className={`flex-none w-64 sm:w-72 flex flex-col p-4 rounded-2xl border snap-start transition-all duration-500 ${
                              isHighlighted
                                ? "bg-indigo-500/10 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                : isCited
                                ? "bg-zinc-900 border-white/10 hover:border-white/20"
                                : "bg-zinc-900/50 border-white/5 opacity-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-zinc-300">[{id}]</span>
                              <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                                Page {formatPageLabel(meta)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-3 flex-grow">
                              {meta.snippet ?? "No text snippet available."}
                            </p>
                            <div className="text-[10px] text-zinc-500 font-medium truncate mt-auto">
                              {formatSource(meta.source)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* PROCESSING SKELETON */}
        {loading && (
          <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="flex justify-end w-full">
              <div className="bg-zinc-800 text-zinc-100 px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-[15px] opacity-70">
                {question}
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Spinner />
                </div>
                <span className="font-semibold text-zinc-200">Processing...</span>
              </div>

              <div className="pl-11 flex flex-col gap-3 w-full max-w-lg">
                <div className="h-10 bg-white/5 border border-white/10 rounded-xl flex items-center px-4 animate-pulse">
                  <span className="text-xs font-medium text-zinc-400">Analyzing user intent...</span>
                </div>
                <div className="h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center px-4 animate-pulse delay-75">
                  <span className="text-xs font-medium text-indigo-300">Searching vector database...</span>
                </div>
                <div className="h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center px-4 animate-pulse delay-150">
                  <span className="text-xs font-medium text-amber-300">Critic evaluating chunks...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible anchor for auto-scroll */}
        <div ref={chatEndRef} className="h-10" /> 
      </div>

      {/* FLOATING GLASS DOCK (INPUT) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 shadow-2xl flex flex-col gap-2 relative">
          
          {/* MODERN CUSTOM UI DROPDOWN */}
          <div className="flex items-center gap-3 px-3 py-1 relative">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Search In</span>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center justify-between gap-3 bg-black/40 text-zinc-200 text-xs rounded-full px-4 py-1.5 border transition-all focus:outline-none min-w-[180px] shadow-sm ${
                  isDropdownOpen 
                    ? "border-indigo-500/50 bg-indigo-500/5 ring-2 ring-indigo-500/20" 
                    : "border-white/10 hover:bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="truncate max-w-[150px] sm:max-w-[200px] font-medium">
                  {selectedScope === null 
                    ? "All Uploaded Documents" 
                    : selectedScope.length > 25 ? selectedScope.slice(0, 25) + "..." : selectedScope}
                </span>
                <svg className={`w-3 h-3 text-zinc-400 transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Custom Dropdown Menu (Opens Upwards) */}
              {isDropdownOpen && (
                <>
                  {/* Invisible backdrop to close dropdown when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  
                  <div className="absolute bottom-[calc(100%+12px)] left-0 mb-1 w-full min-w-[240px] bg-zinc-800/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
                    <div className="max-h-[260px] overflow-y-auto flex flex-col p-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScope(null);
                          setIsDropdownOpen(false);
                        }}
                        className={`text-left px-3 py-2.5 text-xs rounded-xl transition-all flex items-center gap-2.5 outline-none ${
                          selectedScope === null 
                            ? "bg-indigo-500/20 text-indigo-300 font-medium shadow-inner" 
                            : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100 focus:bg-white/5"
                        }`}
                      >
                        <div className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${selectedScope === null ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-zinc-400"}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        All Uploaded Documents
                      </button>
                      
                      {userFiles.length > 0 && <div className="h-px bg-white/5 my-1.5 mx-2" />}
                      
                      {userFiles.length === 0 && (
                        <div className="px-3 py-3 text-xs text-zinc-500 text-center italic">
                          No documents uploaded yet.
                        </div>
                      )}

                      {userFiles.map(file => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => {
                            setSelectedScope(file.filename);
                            setIsDropdownOpen(false);
                          }}
                          className={`text-left px-3 py-2.5 text-xs rounded-xl transition-all flex items-center gap-2.5 outline-none group ${
                            selectedScope === file.filename 
                              ? "bg-indigo-500/20 text-indigo-300 font-medium shadow-inner" 
                              : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100 focus:bg-white/5"
                          }`}
                          title={file.filename}
                        >
                          <div className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-colors ${
                            selectedScope === file.filename ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-zinc-400 group-hover:text-zinc-300 group-hover:bg-white/10"
                          }`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="truncate">{file.filename}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="relative flex items-end gap-2 bg-black/40 rounded-2xl border border-white/5 p-1 pr-2 shadow-inner focus-within:border-white/10 focus-within:bg-black/60 transition-colors">
            <textarea
              disabled={loading}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canAsk) onAsk();
                }
              }}
              placeholder={loading ? "Generating response..." : "Ask IntelliRAG anything..."}
              className="flex-grow min-h-[44px] max-h-[150px] resize-none bg-transparent p-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none scrollbar-thin disabled:opacity-50"
              rows={1}
            />
            <button 
              onClick={onAsk} 
              disabled={!canAsk} 
              className="mb-1 p-2.5 rounded-xl bg-zinc-100 text-black font-semibold disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all hover:bg-white shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
            >
              {loading ? <Spinner /> : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </div>
          
          {error && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shadow-[0_5px_20px_rgba(239,68,68,0.3)] backdrop-blur-md animate-in slide-in-from-bottom-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}