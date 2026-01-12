import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "IntelliRAG",
  description: "Multi-agent RAG demo UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-zinc-800" />
              <div>
                <p className="text-sm font-semibold leading-none">IntelliRAG</p>
                <p className="text-xs text-zinc-400">Next.js + FastAPI</p>
              </div>
            </div>

            <nav className="flex items-center gap-3 text-sm">
              <Link className="rounded-lg px-3 py-2 hover:bg-zinc-900" href="/">
                Q&A
              </Link>
              <Link className="rounded-lg px-3 py-2 hover:bg-zinc-900" href="/upload">
                PDF Upload
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

        <footer className="border-t border-zinc-800 py-6">
          <div className="mx-auto max-w-5xl px-4 text-xs text-zinc-500">
            © {new Date().getFullYear()} IntelliRAG
          </div>
        </footer>
      </body>
    </html>
  );
}
