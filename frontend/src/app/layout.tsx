import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelliRAG",
  description: "Stateful Multi-Agent RAG",
  icons: {
    icon: "/icon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en">
        <body className="antialiased min-h-screen flex flex-col selection:bg-indigo-500/30">
          
          {/* ONLY SHOW THIS IF THE USER IS SUCCESSFULLY LOGGED IN */}
          <SignedIn>
            <Navbar />
            <main className="flex-1 w-full relative">
              {children}
            </main>
          </SignedIn>

          {/* IF THEY ARE NOT LOGGED IN, FORCE THE LOGIN SCREEN */}
          <SignedOut>
            <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950 relative overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20"></div>
              
              <div className="relative z-10 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
                {/* Logo */}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold tracking-tighter shadow-[0_0_15px_rgba(99,102,241,0.2)] mb-6 text-2xl">
                  IR
                </div>
                <h1 className="text-2xl font-bold text-zinc-100 mb-8 tracking-tight">Welcome to IntelliRAG</h1>
                
                {/* Clerk Sign In Component - 'hash' routing prevents it from looking for URL folders! */}
                <SignIn routing="hash" />
              </div>
            </div>
          </SignedOut>

        </body>
      </html>
    </ClerkProvider>
  );
}