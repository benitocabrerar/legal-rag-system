'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, ChevronRight, BookOpen, X, Scale } from 'lucide-react';
import { HELP_ARTICLES, HELP_CATEGORIES, type HelpArticle } from '@/lib/help-content';
import { cn } from '@/lib/utils';

export default function HelpPage() {
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string>(HELP_ARTICLES[0].id);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return HELP_ARTICLES;
    return HELP_ARTICLES.filter((a) =>
      [a.title, a.description, a.keywords.join(' '), a.body]
        .join(' ')
        .toLowerCase()
        .includes(t),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const out: Record<string, HelpArticle[]> = {};
    for (const a of filtered) {
      if (!out[a.category]) out[a.category] = [];
      out[a.category].push(a);
    }
    return out;
  }, [filtered]);

  const article = HELP_ARTICLES.find((a) => a.id === active) ?? HELP_ARTICLES[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
            <span className="hidden sm:inline text-slate-300">/</span>
            <Link href="/" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center">
                <Scale className="w-3.5 h-3.5" />
              </span>
              <span className="text-slate-900">Poweria <span className="text-slate-500">Legal</span></span>
            </Link>
            <span className="hidden sm:inline text-slate-400">·</span>
            <span className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-violet-600" />
              Centro de ayuda
            </span>
          </div>
          <Link
            href="/dashboard"
            className="hidden md:inline-flex text-xs font-bold text-indigo-700 hover:text-indigo-900 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            Ir al dashboard →
          </Link>
        </div>
      </header>

      {/* Hero search */}
      <section className="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-indigo-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span className="w-1 h-1 rounded-full bg-violet-500" />
            Centro de ayuda · Poweria Legal
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            ¿En qué te podemos <em className="not-italic bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">ayudar</em>?
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            13 artículos sobre todo el producto · busca por palabra clave o navega por categoría.
          </p>

          <div className="mt-6 relative max-w-xl mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Probá "factura", "audiencia", "atajos"…'
              className="w-full pl-10 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Body: ToC + article */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ToC */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 self-start">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3 max-h-[75vh] overflow-y-auto">
            {(Object.keys(HELP_CATEGORIES) as Array<keyof typeof HELP_CATEGORIES>).map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const meta = HELP_CATEGORIES[cat];
              return (
                <div key={cat} className="mb-3 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 inline-flex items-center gap-1.5">
                    <span className="text-base leading-none">{meta.emoji}</span>
                    {meta.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((a) => {
                      const isActive = a.id === active;
                      return (
                        <button
                          key={a.id}
                          onClick={() => setActive(a.id)}
                          className={cn(
                            'w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left transition-colors',
                            isActive ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-slate-50',
                          )}
                        >
                          <span className="text-base leading-none mt-0.5">{a.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              'text-[12px] font-bold truncate',
                              isActive ? 'text-violet-900' : 'text-slate-700',
                            )}>{a.title}</div>
                            <div className={cn(
                              'text-[11px] line-clamp-1',
                              isActive ? 'text-violet-700' : 'text-slate-500',
                            )}>{a.description}</div>
                          </div>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-600 mt-1 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-slate-400">
                Nada coincide con &quot;{q}&quot;.
              </div>
            )}
          </div>
        </aside>

        {/* Article */}
        <article className="lg:col-span-8">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl leading-none">{article.icon}</span>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  {HELP_CATEGORIES[article.category].emoji}{' '}
                  {HELP_CATEGORIES[article.category].label}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{article.title}</h1>
                <p className="text-sm text-slate-500 mt-1.5">{article.description}</p>
              </div>
            </div>

            <ArticleBody markdown={article.body} />

            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>¿No encontraste lo que buscabas?</span>
              <Link href="/#contacto" className="font-bold text-violet-700 hover:text-violet-900">
                Hablar con un humano →
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

// ─── Markdown-lite renderer (mismo lenguaje que el chat) ────

function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  return (
    <div className="space-y-3 text-[15px] text-slate-700 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === 'h2') return <h2 key={i} className="text-xl sm:text-2xl font-black text-slate-900 mt-8 mb-2 leading-tight">{renderInline(b.text)}</h2>;
        if (b.type === 'h3') return <h3 key={i} className="text-lg font-bold text-slate-800 mt-5 mb-1.5">{renderInline(b.text)}</h3>;
        if (b.type === 'ul') return (
          <ul key={i} className="list-disc pl-5 space-y-1.5 marker:text-violet-500">
            {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
          </ul>
        );
        if (b.type === 'ol') return (
          <ol key={i} className="list-decimal pl-5 space-y-1.5 marker:text-slate-500 marker:font-bold">
            {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
          </ol>
        );
        return <p key={i}>{renderInline(b.text)}</p>;
      })}
    </div>
  );
}

interface Block {
  type: 'p' | 'h2' | 'h3' | 'ul' | 'ol';
  text: string;
  items: string[];
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const out: Block[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listBuf: string[] = [];
  let paraBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length > 0 && listType) {
      out.push({ type: listType, text: '', items: [...listBuf] });
      listBuf = []; listType = null;
    }
  };
  const flushPara = () => {
    if (paraBuf.length > 0) {
      out.push({ type: 'p', text: paraBuf.join(' '), items: [] });
      paraBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+/.test(line)) {
      flushList(); flushPara();
      out.push({ type: 'h2', text: line.replace(/^##\s+/, ''), items: [] });
    } else if (/^###\s+/.test(line)) {
      flushList(); flushPara();
      out.push({ type: 'h3', text: line.replace(/^###\s+/, ''), items: [] });
    } else if (/^\d+\.\s+/.test(line)) {
      flushPara();
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listBuf.push(line.replace(/^\d+\.\s+/, ''));
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listBuf.push(line.replace(/^[-*]\s+/, ''));
    } else if (line === '') {
      flushList(); flushPara();
    } else {
      flushList();
      paraBuf.push(line);
    }
  }
  flushList(); flushPara();
  return out;
}

function renderInline(text: string): React.ReactNode {
  // **bold**, [text](href), `code`
  const tokens: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const bold = rest.match(/\*\*([^*]+)\*\*/);
    const link = rest.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const code = rest.match(/`([^`]+)`/);
    const candidates: Array<{ at: number; len: number; render: () => React.ReactNode }> = [];
    if (bold && bold.index !== undefined) candidates.push({
      at: bold.index, len: bold[0].length,
      render: () => <strong key={key++} className="font-bold text-slate-900">{bold[1]}</strong>,
    });
    if (link && link.index !== undefined) candidates.push({
      at: link.index, len: link[0].length,
      render: () => <a key={key++} href={link[2]} className="text-violet-700 underline-offset-4 hover:underline">{link[1]}</a>,
    });
    if (code && code.index !== undefined) candidates.push({
      at: code.index, len: code[0].length,
      render: () => <code key={key++} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[13px] font-mono text-slate-800">{code[1]}</code>,
    });
    if (candidates.length === 0) {
      tokens.push(<span key={key++}>{rest}</span>);
      break;
    }
    candidates.sort((a, b) => a.at - b.at);
    const m = candidates[0];
    if (m.at > 0) tokens.push(<span key={key++}>{rest.slice(0, m.at)}</span>);
    tokens.push(m.render());
    rest = rest.slice(m.at + m.len);
  }
  return tokens;
}
