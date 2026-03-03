import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelliRAG | Enterprise AI",
  description: "Stateful Multi-Agent RAG",
  icons: {
    icon: "/icon.ico",
  }
};

/**
 * Root layout (Premium UI Redesign)
 *
 * Responsibilities:
 * - Set up HTML structure
 * - Render the sticky Glassmorphism Navigation Bar
 * - Wrap pages in a clean main container
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col selection:bg-indigo-500/30">
        
        {/* PREMIUM GLASSMORPHISM NAVBAR */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/40">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            
            {/* Logo Area */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold tracking-tighter shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                IR
              </div>
              <span className="text-lg font-bold tracking-tight text-zinc-100">IntelliRAG</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-6">
              <Link 
                href="/" 
                className="text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all"
              >
                Ask
              </Link>
              <Link 
                href="/upload" 
                className="text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all"
              >
                Upload PDF
              </Link>
            </nav>

          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 w-full relative">
          {children}
        </main>

      </body>
    </html>
  );
}
