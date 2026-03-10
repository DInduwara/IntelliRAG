"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs"; 
import { indexPdf, getMyFiles, deleteMyFiles } from "@/lib/api";
import type { FileItem } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import { FileDropzone } from "@/components/FileDropzone";

export default function UploadPage() {
  const { getToken } = useAuth();

  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [chunks, setChunks] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: State to control the custom delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const token = await getToken();
      if (!token) return;
      const res = await getMyFiles(token);
      setUserFiles(res.files);
    } catch (err) {
      console.error("Failed to load user files:", err);
    } finally {
      setLoadingFiles(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function onFile(file: File) {
    setError(null);
    setStatus(null);
    setChunks(null);
    setFileName(file.name);

    try {
      setLoading(true);
      const token = await getToken(); 
      const res = await indexPdf(file, token || undefined); 
      
      window.localStorage.setItem("intelirag:lastUploadedPdf", file.name);

      setStatus(res.message ?? res.status ?? "Indexed successfully");
      setChunks(typeof res.chunks_indexed === "number" ? res.chunks_indexed : null);
      
      await fetchFiles();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(filename: string) {
    const next = new Set(selectedFiles);
    if (next.has(filename)) next.delete(filename);
    else next.add(filename);
    setSelectedFiles(next);
  }

  function toggleAll() {
    if (selectedFiles.size === userFiles.length) {
      setSelectedFiles(new Set()); 
    } else {
      setSelectedFiles(new Set(userFiles.map(f => f.filename))); 
    }
  }

  // Changed: Now just opens the modal instead of window.confirm
  function onDeleteSelected() {
    if (selectedFiles.size === 0) return;
    setShowDeleteConfirm(true);
  }

  // NEW: Actually executes the deletion
  async function executeDelete() {
    setShowDeleteConfirm(false); // Close modal immediately
    setError(null);
    setStatus(null);
    setChunks(null);

    try {
      setLoading(true);
      const token = await getToken(); 
      
      const res = await deleteMyFiles(Array.from(selectedFiles), token || undefined); 
      
      setStatus(res.message ?? "Deleted successfully");
      setSelectedFiles(new Set()); 
      await fetchFiles(); 
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto pt-16 px-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
            Knowledge Base
          </h1>
          <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Upload PDF documents to expand IntelliRAG&apos;s memory, or manage your existing secure context.
          </p>
        </div>

        {/* 1. UPLOAD SECTION */}
        <div className="relative group rounded-3xl border border-white/5 bg-zinc-900/40 p-2 sm:p-8 shadow-2xl backdrop-blur-sm transition-all hover:border-indigo-500/20 mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-2">Add New Document</h2>
          <div className="bg-black/20 rounded-2xl p-4 border border-white/5 border-dashed group-hover:border-indigo-500/30 transition-colors">
            <FileDropzone onFile={onFile} />
          </div>

          {/* Upload Status Elements */}
          {loading && fileName && (
            <div className="mt-6 flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 rounded-2xl shrink-0">
              <Spinner />
              <span className="text-sm font-semibold text-indigo-300">Processing <span className="text-indigo-200">{fileName}</span>...</span>
            </div>
          )}

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

        {/* 2. FILE MANAGER SECTION */}
        <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-4 sm:p-8 shadow-xl backdrop-blur-sm">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Your Files ({userFiles.length})</h2>
            
            {userFiles.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {selectedFiles.size === userFiles.length ? "Deselect All" : "Select All"}
                </button>
                
                {selectedFiles.size > 0 && (
                  <button
                    type="button"
                    onClick={onDeleteSelected}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete ({selectedFiles.size})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {loadingFiles ? (
              <div className="flex justify-center items-center py-10 opacity-50">
                <Spinner />
              </div>
            ) : userFiles.length === 0 ? (
              <div className="text-center py-10 border border-white/5 border-dashed rounded-2xl bg-black/20">
                <p className="text-sm text-zinc-500">You haven&apos;t uploaded any documents yet.</p>
              </div>
            ) : (
              userFiles.map((file) => (
                <label 
                  key={file.id} 
                  className={`group flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedFiles.has(file.filename) 
                      ? "bg-indigo-500/10 border-indigo-500/30" 
                      : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40"
                  }`}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.filename)}
                      onChange={() => toggleSelection(file.filename)}
                      className="w-5 h-5 cursor-pointer appearance-none rounded-md border border-zinc-600 bg-transparent checked:border-indigo-500 checked:bg-indigo-500 transition-all peer"
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-zinc-300 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  <div className="flex flex-col min-w-0 flex-grow">
                    <span className="text-sm font-medium text-zinc-200 truncate">{file.filename}</span>
                    <span className="text-xs text-zinc-500">
                      Uploaded on {new Date(file.upload_timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* NEW: CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 shrink-0 border border-red-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-bold text-zinc-100">Confirm Deletion</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-zinc-200">{selectedFiles.size} document(s)</strong>? This will remove them from your knowledge base and the vector store. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
