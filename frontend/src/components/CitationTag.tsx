"use client";

import { useState, useRef } from "react";
import type { CitationsMap } from "@/lib/types";

function formatSource(source?: string) {
  if (!source) return "unknown";
  const parts = source.split(/[/\\]/);
  return parts[parts.length - 1] || source;
}

function formatPageLabel(meta?: { page?: string | number; page_label?: string | number }) {
  if (!meta) return "unknown";
  const pl = meta.page_label ?? meta.page;
  return pl === undefined || pl === null || pl === "" ? "unknown" : String(pl);
}

export function CitationTag({
  id,
  citations,
  onClick,
}: {
  id: string;
  citations: CitationsMap;
  onClick: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const meta = citations[id];

  const handleMouseEnter = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Slight delay before hiding to prevent tooltip flickering
    timeoutRef.current = window.setTimeout(() => setIsHovered(false), 150);
  };

  return (
    <span 
      className="relative inline-block" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => onClick(id)}
        className="mx-0.5 inline-flex items-center rounded border border-indigo-500/40 bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-100 hover:border-indigo-400 hover:shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all cursor-pointer"
        aria-label={`Citation ${id}`}
      >
        {id}
      </button>

      {/* FEATURE 4: Custom Animated Hover Tooltip */}
      {isHovered && meta && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 z-50 rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 pointer-events-none">
          
          {/* Tooltip Header: Page & Source */}
          <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Page {formatPageLabel(meta)}
            </span>
            <span className="text-[10px] font-medium text-zinc-500 truncate max-width: 120px">
              {formatSource(meta.source)}
            </span>
          </div>
          
          {/* Tooltip Body: Snippet Preview */}
          <p className="text-xs text-zinc-300 leading-relaxed italic line-clamp-4">
            &quot;{meta.snippet ?? "No snippet provided."}&quot;
          </p>
          
          {/* Tooltip Footer: Call to action */}
          <div className="mt-3 pt-2 text-[10px] font-bold tracking-widest uppercase text-zinc-500 text-center flex items-center justify-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click to Jump to Evidence
          </div>

          {/* Tooltip CSS Triangle Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-b border-r border-white/10 transform rotate-45"></div>
        </div>
      )}
    </span>
  );
}