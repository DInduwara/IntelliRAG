import Link from "next/link";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 font-black">
              IR
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">IntelliRAG</div>
              <div className="text-xs text-zinc-400">Multi-Agent RAG</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/" label="Ask" />
            <NavLink href="/upload" label="Upload PDF" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-zinc-400">
          IntelliRAG • FastAPI + Pinecone + OpenAI • Local dev UI
        </div>
      </footer>
    </div>
  );
}
