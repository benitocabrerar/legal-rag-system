'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Maximize2, Minimize2, Loader2, AlertTriangle, CheckCircle2, Brain, Sparkles, FileText, ListChecks } from 'lucide-react';
import { litigationAPI } from '@/lib/api';
import { getAuthToken } from '@/lib/get-auth-token';
import { BriefPanel } from '@/components/litigation/BriefPanel';
import { TimelinePanel } from '@/components/litigation/TimelinePanel';
import { ArgumentsPanel } from '@/components/litigation/ArgumentsPanel';
import { NotesPanel } from '@/components/litigation/NotesPanel';
import { DocumentsPanel } from '@/components/litigation/DocumentsPanel';
import { ArticleLookupPanel } from '@/components/litigation/ArticleLookupPanel';
import { ArgumentDeck } from '@/components/litigation/ArgumentDeck';
import { AudienceTimer } from '@/components/litigation/AudienceTimer';
import { LitigationChat } from '@/components/litigation/LitigationChat';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type CenterTab = 'deck' | 'arguments' | 'documents' | 'article';

interface WarmupState {
  pct: number;
  label: string;
  phase: string;
  summary?: {
    brain?: { documentCount?: number; riskLevel?: string; summary?: string; nextActionsCount?: number; proceduralStage?: string };
    totals?: { documents: number; aiAnalyses: number; courtFiled: number; events: number };
    lastDocument?: { title: string; kind: string | null; createdAt: string };
    changesDetected?: string[];
  };
  ready: boolean;
  error?: string;
}

export default function LitigationPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const caseId = params?.id as string;
  const [centerTab, setCenterTab] = useState<CenterTab>('deck');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingArticleRef, setPendingArticleRef] = useState<string | null>(null);
  const [warmup, setWarmup] = useState<WarmupState>({ pct: 0, label: 'Conectando…', phase: 'starting', ready: false });
  const warmupAbortRef = useRef<AbortController | null>(null);
  const [refreshingBrief, setRefreshingBrief] = useState(false);

  const refreshBrief = async () => {
    setRefreshingBrief(true);
    try {
      const token = await getAuthToken();
      // Re-sintetizar cerebro (fuerza nuevo análisis IA del caso completo)
      await fetch(`${API_URL}/api/v1/cases/${caseId}/brain/refresh`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Invalidar caché del brief para forzar re-fetch
      await queryClient.invalidateQueries({ queryKey: ['litigation-brief', caseId] });
    } catch { /* silencioso — el UI muestra el estado previo */ }
    finally { setRefreshingBrief(false); }
  };

  // ─── Pre-warmup automático al montar la sala ──────────────────────────
  // Re-sintetiza el cerebro del caso + recarga brief + fingerprint en
  // paralelo. Garantiza que el abogado entre a la audiencia con TODA la
  // información al 100% actualizada.
  useEffect(() => {
    if (!caseId) return;
    const ac = new AbortController();
    warmupAbortRef.current = ac;

    const run = async () => {
      try {
        const token = await getAuthToken();
        const r = await fetch(`${API_URL}/api/v1/cases/${caseId}/litigation-warmup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ac.signal,
        });
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let summary: any = undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (ac.signal.aborted) return;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const lines = chunk.split('\n').filter((l) => !l.startsWith(':'));
            const evLine = lines.find((l) => l.startsWith('event:'));
            const dataLine = lines.find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const ev = evLine ? evLine.slice(6).trim() : 'message';
            let payload: any = null;
            try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { /* ignore */ }
            if (ev === 'phase' && payload) {
              setWarmup((s) => ({ ...s, pct: payload.pct, label: payload.label, phase: payload.phase }));
            } else if (ev === 'summary' && payload) {
              summary = payload;
            } else if (ev === 'done') {
              setWarmup({ pct: 100, label: '¡Sala lista!', phase: 'done', ready: true, summary });
              // Invalida el cache del brief para forzar re-fetch
              await queryClient.invalidateQueries({ queryKey: ['litigation-brief', caseId] });
            } else if (ev === 'error') {
              setWarmup((s) => ({ ...s, error: payload?.error || 'Error en pre-warmup', ready: true }));
            }
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setWarmup((s) => ({ ...s, error: e?.message || 'Error en conexión', ready: true }));
        }
      }
    };
    void run();
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const lookupArticle = (ref: string) => {
    setPendingArticleRef(ref);
    setCenterTab('article');
    setTimeout(() => {
      const el = document.getElementById('litigation-article-input') as HTMLInputElement | null;
      if (el) {
        el.value = ref;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
      }
    }, 50);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['litigation-brief', caseId],
    queryFn: () => litigationAPI.brief(caseId),
    enabled: !!caseId,
    refetchOnWindowFocus: false,
  });

  // Fullscreen toggle.
  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch { /* user cancelled */ }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard shortcuts: Cmd+/ focuses article lookup; Esc exits fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) {
        // Cmd+/ should still work even from inputs.
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
          e.preventDefault();
          setCenterTab('article');
          setTimeout(() => document.getElementById('litigation-article-input')?.focus(), 30);
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setCenterTab('article');
        setTimeout(() => document.getElementById('litigation-article-input')?.focus(), 30);
      } else if (e.key === '1') setCenterTab('deck');
      else if (e.key === '2') setCenterTab('arguments');
      else if (e.key === '3') setCenterTab('documents');
      else if (e.key === '4') setCenterTab('article');
      else if (e.key === 'f' && !e.metaKey && !e.ctrlKey) toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden flex flex-col">
      {/* Top bar — wraps onto two rows on phones so nothing gets clipped. */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-y-1 px-3 py-2 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push(`/dashboard/cases/${caseId}`)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Salir</span>
          </button>
          <span className="hidden sm:inline text-slate-600">/</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-violet-400">Sala de Litigación</span>
          {data?.case?.title && (
            <span className="text-sm font-semibold text-slate-100 truncate ml-1 sm:ml-2 min-w-0">{data.case.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AudienceTimer />
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
            title="Pantalla completa (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isFullscreen ? 'Salir' : 'Pantalla completa'}</span>
          </button>
        </div>
      </header>

      {/* Pre-warmup overlay — bloquea la sala hasta que cerebro esté al día */}
      {!warmup.ready && !warmup.error && (
        <div className="flex-1 flex items-center justify-center px-6 py-8 bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950">
          <div className="w-full max-w-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center shadow-lg shadow-violet-500/30 animate-pulse">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Preparando la sala</h2>
                <p className="text-xs text-slate-400">Asegurando que toda la información del expediente esté al 100% antes de la audiencia</p>
              </div>
              <div className="ml-auto text-4xl font-black tabular-nums text-violet-300">
                {Math.round(warmup.pct)}<span className="text-xl text-violet-500">%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${Math.max(2, warmup.pct)}%` }}
              />
              <div
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-full"
                style={{ left: `${Math.max(0, Math.min(95, warmup.pct - 5))}%` }}
              />
            </div>

            <div className="text-sm text-slate-200 font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              {warmup.label}
            </div>

            {/* Checklist de fases */}
            <div className="space-y-2 text-xs">
              {[
                { id: 'brain',     label: 'Re-sintetizar cerebro del caso',     threshold: 55 },
                { id: 'parallel',  label: 'Recargar brief de litigación',       threshold: 60 },
                { id: 'parallel',  label: 'Actualizar fingerprint',             threshold: 88 },
                { id: 'done',      label: 'Sala lista para audiencia',          threshold: 100 },
              ].map((p, i) => {
                const done = warmup.pct >= p.threshold;
                const active = !done && warmup.pct >= (i === 0 ? 5 : [55, 60, 88][i - 1]);
                return (
                  <div key={i} className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-700 shrink-0" />
                    )}
                    <span className={cn(
                      done ? 'text-emerald-300' : active ? 'text-slate-100 font-semibold' : 'text-slate-500'
                    )}>
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                warmupAbortRef.current?.abort();
                setWarmup((s) => ({ ...s, ready: true }));
              }}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition mx-auto block"
            >
              Saltar pre-warmup y entrar directo
            </button>
          </div>
        </div>
      )}

      {/* Resumen de pre-warmup completo — banner verde corto, se auto-cierra */}
      {warmup.ready && warmup.summary && !warmup.error && (
        <WarmupSummaryBanner summary={warmup.summary} />
      )}

      {/* Loading / Error */}
      {warmup.ready && isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : warmup.ready && (error || !data) ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-rose-400">
          <AlertTriangle className="w-8 h-8" />
          <p className="text-sm font-semibold">No pudimos cargar el caso</p>
          <button onClick={() => router.push('/dashboard')} className="text-xs underline hover:text-rose-300">
            Volver al dashboard
          </button>
        </div>
      ) : warmup.ready && data ? (
        <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-y-auto md:overflow-hidden">
          {/* Left column: Brief + Timeline */}
          <aside className="col-span-12 md:col-span-3 flex flex-col gap-3 md:overflow-y-auto">
            <BriefPanel data={data} onRefresh={refreshBrief} refreshing={refreshingBrief} />
            <TimelinePanel events={data.timeline} />
          </aside>

          {/* Center column: tabbed work area */}
          <section className="col-span-12 md:col-span-6 flex flex-col gap-3 md:overflow-hidden">
            <CenterTabBar tab={centerTab} setTab={setCenterTab} />

            <div className="flex-1 md:overflow-y-auto space-y-3">
              {centerTab === 'deck' && (
                <ArgumentDeck caseId={caseId} onLookupArticle={lookupArticle} />
              )}
              {centerTab === 'arguments' && (
                <>
                  <ArgumentsPanel caseId={caseId} />
                  <NotesPanel caseId={caseId} />
                </>
              )}
              {centerTab === 'documents' && (
                <DocumentsPanel documents={data.documents} onRefresh={refreshBrief} refreshing={refreshingBrief} />
              )}
              {centerTab === 'article' && <ArticleLookupPanel caseId={caseId} />}
            </div>
          </section>

          {/* Right column: AI chat — keeps a usable height on phones. */}
          <aside className="col-span-12 md:col-span-3 rounded-xl bg-slate-900/40 border border-slate-700/50 overflow-hidden flex flex-col min-h-[60vh] md:min-h-0">
            <LitigationChat
              caseId={caseId}
              suggestions={[
                'Resumen del caso en 3 frases',
                '¿Qué artículo aplica al hecho principal?',
                'Posibles objeciones a esperar',
                'Cita jurisprudencia relevante',
              ]}
            />
          </aside>
        </main>
      ) : null}

      {/* Footer — keyboard hints hidden on phones (no physical keyboard). */}
      <footer className="shrink-0 px-3 py-1 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-500 flex items-center justify-between">
        <div className="hidden lg:flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">1</kbd> tarjetas</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">2</kbd> notas</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">3</kbd> docs</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">4</kbd> art.</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">←/→</kbd> navegar mazo</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">␣</kbd> marcar expuesta</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">P</kbd> presentador</span>
          <span><kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">F</kbd> fullscreen</span>
        </div>
        <span className="text-[10px]">Sala de Litigación · Poweria Legal</span>
      </footer>
    </div>
  );
}

/**
 * Banner que aparece tras completar el pre-warmup. Muestra al abogado un
 * resumen accionable de lo que se actualizó. Auto-cierra a los 8 segundos
 * pero se puede cerrar manualmente. Si hay cambios detectados, los lista.
 */
function WarmupSummaryBanner({ summary }: { summary: NonNullable<WarmupState['summary']> }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 12000);
    return () => clearTimeout(t);
  }, []);
  if (!open) return null;

  return (
    <div className="shrink-0 mx-3 mt-3 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 via-teal-950/30 to-emerald-950/50 backdrop-blur p-3 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 grid place-items-center text-emerald-300 shrink-0">
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-emerald-200">Sala lista — toda la información al día</div>
        <div className="text-[11px] text-emerald-100/80 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {summary.brain?.documentCount != null && (
            <span><strong>{summary.brain.documentCount}</strong> docs analizados</span>
          )}
          {summary.totals && (
            <>
              <span><strong>{summary.totals.aiAnalyses}</strong> análisis IA</span>
              <span><strong>{summary.totals.courtFiled}</strong> presentados ⚖️</span>
              <span><strong>{summary.totals.events}</strong> eventos</span>
            </>
          )}
          {summary.brain?.riskLevel && (
            <span>Riesgo: <strong className={cn(
              summary.brain.riskLevel === 'high' ? 'text-rose-300' :
              summary.brain.riskLevel === 'medium' ? 'text-amber-300' : 'text-emerald-200'
            )}>{summary.brain.riskLevel.toUpperCase()}</strong></span>
          )}
          {summary.brain?.proceduralStage && (
            <span>Etapa: <strong>{summary.brain.proceduralStage}</strong></span>
          )}
        </div>
        {summary.changesDetected && summary.changesDetected.length > 0 && (
          <div className="text-[11px] text-emerald-100/70 mt-1 italic">
            ✓ {summary.changesDetected.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="text-emerald-300/60 hover:text-emerald-100 text-xs font-semibold shrink-0"
        title="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}

function CenterTabBar({ tab, setTab }: { tab: CenterTab; setTab: (t: CenterTab) => void }) {
  const tabs: Array<{ id: CenterTab; label: string; short: string; hint: string }> = [
    { id: 'deck',       label: '🎴 Tarjetas IA',       short: '🎴 Tarjetas',  hint: '1' },
    { id: 'arguments',  label: 'Argumentos & notas',   short: 'Argumentos',   hint: '2' },
    { id: 'documents',  label: 'Documentos',           short: 'Docs',         hint: '3' },
    { id: 'article',    label: 'Buscar artículo',      short: 'Artículo',     hint: '4' },
  ];
  return (
    <div className="inline-flex items-center bg-slate-900/60 border border-slate-700/50 rounded-xl p-1 self-start shadow-sm overflow-x-auto max-w-full">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all',
              active
                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100',
            )}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
            <kbd className="hidden lg:inline opacity-50 font-mono text-[9px]">{t.hint}</kbd>
          </button>
        );
      })}
    </div>
  );
}
