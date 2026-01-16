import type { ButtonHTMLAttributes } from "react";

/**
 * Button primitive.
 * Notes:
 * - Primary: high emphasis action
 * - Ghost: secondary action
 * - Accessible focus ring for keyboard navigation
 */

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-white/20 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const styles =
    variant === "primary"
      ? "bg-white text-zinc-950 hover:bg-zinc-200"
      : "bg-white/0 text-zinc-100 hover:bg-white/10 border border-white/10";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
