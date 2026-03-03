"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/40">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        
        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold tracking-tighter shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:bg-indigo-500/30 transition-colors">
            IR
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-100">IntelliRAG</span>
        </Link>

        {/* Navigation & Auth Area */}
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-all ${
                pathname === '/' 
                  ? 'text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ask
            </Link>
            <Link 
              href="/upload" 
              className={`text-sm font-medium transition-all ${
                pathname === '/upload' 
                  ? 'text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Upload PDF
            </Link>
          </nav>

          {/* Auth Controls */}
          <div className="pl-6 border-l border-white/10 flex items-center">
            <SignedOut>
              <Link 
                href="/sign-in"
                className="text-sm font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                Sign In
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 ring-2 ring-white/10 hover:ring-white/30 transition-all"
                  }
                }}
              /> 
            </SignedIn>
          </div>
        </div>

      </div>
    </header>
  );
}