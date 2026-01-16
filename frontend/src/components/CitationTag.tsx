"use client";

/**
 * Renders a clickable citation token inside the answer text.
 * Provides a simple tooltip built from the citations map.
 *
 * Behavior:
 * - click: calls onClick(id) to jump to evidence
 * - hover/focus: shows metadata (page, source, snippet) if available
 */

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
  const meta = citations[id];

  const tooltip =
    meta
      ? `Page ${formatPageLabel(meta)} • ${formatSource(meta.source)}\n\n${meta.snippet ?? ""}`
      : "No metadata available for this citation.";

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className="mx-0.5 inline-flex items-center rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
      title={tooltip}
    >
      [{id}]
    </button>
  );
}
