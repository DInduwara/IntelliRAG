import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "IntelliRAG",
  description: "Multi-Agent RAG",
   icons: {
    icon: "/icon.ico",
  }
};

/**
 * Root layout
 *
 * Responsibilities:
 * - Set up HTML structure and lang attribute
 * - Wrap all pages with AppShell for consistent layout
 */


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
