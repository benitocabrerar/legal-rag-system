'use client';

import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

interface Props {
  kicker: string;
  title: string;
  subtitle?: string;
  effectiveDate?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for /terms, /privacy, /lopdp. Keeps the dark landing
 * aesthetic while staying readable for long-form legal copy.
 */
export function LegalShell({ kicker, title, subtitle, effectiveDate, children }: Props) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            Poweria Legal
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-slate-300">
          <span className="w-1 h-1 rounded-full bg-violet-400" />
          {kicker}
        </span>
        <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">{subtitle}</p>}
        {effectiveDate && (
          <p className="mt-3 text-xs text-slate-500">Vigencia: {effectiveDate}</p>
        )}

        <div className="legal-prose mt-10 max-w-none text-slate-300 leading-relaxed
          [&>h2]:text-2xl [&>h2]:font-black [&>h2]:tracking-tight [&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-3
          [&>h3]:text-lg [&>h3]:font-bold [&>h3]:tracking-tight [&>h3]:text-white [&>h3]:mt-6 [&>h3]:mb-2
          [&>p]:my-3 [&>p]:text-[15px] [&>p]:leading-relaxed
          [&>ul]:my-3 [&>ul]:pl-5 [&>ul]:list-disc [&>ul]:space-y-1 [&_li]:text-[15px] [&_li]:leading-relaxed
          [&_a]:text-violet-300 [&_a]:underline-offset-4 hover:[&_a]:text-violet-200 hover:[&_a]:underline
          [&_strong]:text-white [&_strong]:font-semibold
        ">
          {children}
        </div>

        <footer className="mt-16 pt-6 border-t border-white/5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} COGNITEX · Ecuador</span>
          <Link href="/" className="hover:text-slate-300">Volver al inicio →</Link>
        </footer>
      </article>
    </main>
  );
}
