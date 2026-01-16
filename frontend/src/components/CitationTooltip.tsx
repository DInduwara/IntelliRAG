"use client";

import type { CitationsMap } from "@/lib/types";

function formatSource(source?: string) {
  if (!source) return "unknown";
  const parts = source.split(/[/\\]/);
  return parts[parts.length - 1] || source;
}

export function CitationTooltip({
  id,
  citations,
}: {
  id: string;
  citations: CitationsMap;
}) {
  const meta = citations[id];

  if (!meta) return null;

  return (
    <div
      className="
        pointer-events-none absolute z-50 w-80 rounded-xl border border-white/15
        bg-zinc-950/95 p-3 text-xs text-zinc-100 shadow-xl
      "
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-zinc-100">[{id}]</div>
        <div className="text-zinc-400">
          Page{" "}
          <span className="text-zinc-200 font-semibold">
            {meta.page_label ?? meta.page ?? "?"}
          </span>
        </div>
      </div>

      <div className="mt-1 text-[11px] text-zinc-400">
        {formatSource(meta.source)}
      </div>

      <div className="mt-2 whitespace-pre-wrap text-zinc-200/90">
        {meta.snippet ?? "(no snippet available)"}
      </div>
    </div>
  );
}
