export function Spinner({ label }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-zinc-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
