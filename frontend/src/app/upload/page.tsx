"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs"; // <-- NEW: Import Clerk's auth hook
import { indexPdf, adminClearAll } from "@/lib/api";
import { Spinner } from "@/components/Spinner";
import { FileDropzone } from "@/components/FileDropzone";

export default function UploadPage() {
  const { getToken } = useAuth(); // <-- NEW: Initialize the token fetcher

  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [chunks, setChunks] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setStatus(null);
    setChunks(null);
    setFileName(file.name);

    try {
      setLoading(true);

      const token = await getToken(); // <-- NEW: Fetch live token
      
      const res = await indexPdf(file, token || undefined); // <-- NEW: Pass token
      window.localStorage.setItem("intelirag:lastUploadedPdf", file.name);

      setStatus(res.message ?? res.status ?? "Indexed successfully");
      setChunks(typeof res.chunks_indexed === "number" ? res.chunks_indexed : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onClearAll() {
    const key = window.prompt("Enter ADMIN key to CLEAR all documents (uploads + Pinecone vectors):");
    if (!key) return;

    setError(null);
    setStatus(null);
    setChunks(null);

    try {
      setLoading(true);
      
      const token = await getToken(); // <-- NEW: Fetch live token
      
      const res = await adminClearAll(key, token || undefined); // <-- NEW: Pass token
      window.localStorage.removeItem("intelirag:lastUploadedPdf");
      setFileName(null);
      setStatus(res.message ?? "Cleared successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Clear failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pt-16 px-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SECTION */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
          Knowledge Base
        </h1>
        <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Upload PDF documents to expand IntelliRAG&apos;s memory. The AI will immediately process, chunk, and index the file for retrieval.
        </p>
      </div>

      {/* MAIN UPLOAD CONTAINER */}
      <div className="relative group rounded-3xl border border-white/5 bg-zinc-900/40 p-2 sm:p-8 shadow-2xl backdrop-blur-sm transition-all hover:border-indigo-500/20 hover:bg-zinc-900/60 mb-12">
        
        {/* The Dropzone component */}
        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 border-dashed group-hover:border-indigo-500/30 transition-colors">
          <FileDropzone onFile={onFile} />
        </div>

        {/* Upload Status Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-zinc-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Document</span>
              <span className="text-sm font-medium text-zinc-200 truncate">
                {fileName ? fileName : "No file selected"}
              </span>
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full shrink-0">
              <Spinner />
              <span className="text-xs font-semibold text-indigo-300">Processing...</span>
            </div>
          )}
        </div>

        {/* Success / Error Pills */}
        {status && !loading && (
          <div className="mt-6 animate-in zoom-in-95 duration-300">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div className="font-semibold">{status}</div>
                {chunks !== null && (
                  <div className="mt-1 text-emerald-400/80 text-xs font-medium">
                    Successfully extracted and indexed <span className="text-emerald-300 font-bold">{chunks}</span> vector chunks.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 animate-in zoom-in-95 duration-300 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="font-semibold">{error}</div>
          </div>
        )}
      </div>

      {/* ADMIN DANGER ZONE */}
      <div className="mt-12 rounded-3xl border border-red-500/20 bg-red-950/10 p-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pl-2">
          <div>
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-1">Danger Zone</h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
              This action is destructive. It will permanently delete all uploaded PDFs from the local server and wipe the Pinecone vector index.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearAll}
            disabled={loading}
            className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 hover:text-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          >
            Clear Database
          </button>
        </div>
      </div>

    </div>
  );
}
