import type { ReactNode } from "react";

/**
 * Card primitives used across the UI.
 * Intent:
 * - consistent surface styling
 * - consistent spacing
 * - minimal API (Card, CardHeader, CardBody)
 */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-3xl border border-white/10 bg-white/4" +
        "shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur " +
        className
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-300/80">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="px-6 py-5">{children}</div>;
}
