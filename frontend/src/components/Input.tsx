import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: Props) {
  return (
    <input
      className={
        "w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm " +
        "placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 " +
        className
      }
      {...props}
    />
  );
}
