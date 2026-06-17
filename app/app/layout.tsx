import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "StudyFlow — Adaptive Curriculum",
  description: "AI-powered adaptive study feed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <nav className="border-b border-slate-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-indigo-400 text-lg tracking-tight">StudyFlow</span>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Today</Link>
          <Link href="/graph" className="text-sm text-slate-400 hover:text-white transition-colors">Graph</Link>
          <Link href="/progress" className="text-sm text-slate-400 hover:text-white transition-colors">Progress</Link>
          <Link href="/quiz" className="text-sm text-slate-400 hover:text-white transition-colors">Quiz</Link>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
