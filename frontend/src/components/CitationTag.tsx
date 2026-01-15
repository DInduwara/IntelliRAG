"use client";

export function CitationTag({
  id,
  onClick,
}: {
  id: string;
  onClick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className="mx-0.5 inline-flex items-center rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
      title="Jump to evidence"
    >
      [{id}]
    </button>
  );
}
