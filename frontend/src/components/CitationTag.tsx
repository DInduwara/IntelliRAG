"use client";

import { useState } from "react";
import type { CitationsMap } from "@/lib/types";
import { CitationTooltip } from "./CitationTooltip";

export function CitationTag({
  id,
  citations,
  onClick,
}: {
  id: string;
  citations: CitationsMap;
  onClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => onClick(id)}
        className="mx-0.5 inline-flex items-center rounded-lg border border-white/10
                   bg-zinc-950/40 px-2 py-0.5 text-xs font-semibold
                   text-zinc-200 hover:bg-white/10"
        title="Jump to evidence"
      >
        [{id}]
      </button>

      {open && <CitationTooltip id={id} citations={citations} />}
    </span>
  );
}
