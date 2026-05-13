'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, Sparkles, RefreshCcw, CheckCircle2, Circle,
  Volume2, BookMarked, Clock, AlertTriangle, Layers, RefreshCw, Zap,
} from 'lucide-react';
import { litigationAPI, type ArgumentCard, type LitigationFingerprint } from '@/lib/api';
import { getAuthToken } from '@/lib/get-auth-token';
import { cn } from '@/lib/utils';

/** Devuelve la lista de razones por las que una tarjeta puede estar obsoleta
 *  respecto al fingerprint actual del caso. Lista vacía = al día. */
function staleReasons(card: ArgumentCard, fp: LitigationFingerprint | null): string[] {
  if (!fp || !card.generatedAt) return [];
  const cardTs = new Date(card.generatedAt).getTime();
  const out: string[] = [];
  if (fp.brain.generatedAt) {
    const t = new Date(fp.brain.generatedAt).getTime();
    if (t > cardTs) out.push('cerebro del caso actualizado');
  }
  if (fp.lastDocument) {
    const t = new Date(fp.lastDocument.createdAt).getTime();
    if (t > cardTs) out.push(`nuevo documento "${fp.lastDocument.title.slice(0, 35)}"`);
  }
  if (fp.lastAnalysis) {
    const t = new Date(fp.lastAnalysis.createdAt).getTime();
    if (t > cardTs) out.push('nuevo análisis IA');
  }
  if (fp.lastCourtFiled) {
    const t = new Date(fp.lastCourtFiled.presentedAt).getTime();
    if (t > cardTs) out.push(`documento presentado a juzgado`);
  }
  if (fp.lastTaskCompleted) {
    const t = new Date(fp.lastTaskCompleted.completedAt).getTime();
    if (t > cardTs) out.push('tarea completada');
  }
  return out;
}

function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return 'hace segundos';
  if (d < 3_600_000) return `hace ${Math.round(d / 60_000)} min`;
  if (d < 86_400_000) return `hace ${Math.round(d / 3_600_000)} h`;
  return `hace ${Math.round(d / 86_400_000)} d`;
}

const SLUG_STYLE: Record<string, { gradient: string; ring: string; emoji: string; tagBg: string }> = {
  APERTURA:           { gradient: 'from-violet-600 via-fuchsia-600 to-rose-600',    ring: 'ring-violet-500/40',    emoji: '🎙️', tagBg: 'bg-violet-500/15 text-violet-200 border-violet-400/30' },
  HECHOS:             { gradient: 'from-sky-600 via-cyan-600 to-blue-600',          ring: 'ring-sky-500/40',       emoji: '📜', tagBg: 'bg-sky-500/15 text-sky-200 border-sky-400/30' },
  FUNDAMENTO_JURIDICO:{ gradient: 'from-indigo-600 via-violet-600 to-purple-600',   ring: 'ring-indigo-500/40',    emoji: '⚖️', tagBg: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30' },
  PRUEBA:             { gradient: 'from-emerald-600 via-teal-600 to-cyan-600',      ring: 'ring-emerald-500/40',   emoji: '🔍', tagBg: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' },
  REFUTACION:         { gradient: 'from-orange-600 via-rose-600 to-pink-600',       ring: 'ring-orange-500/40',    emoji: '🛡️', tagBg: 'bg-orange-500/15 text-orange-200 border-orange-400/30' },
  REPLICA:            { gradient: 'from-amber-600 via-yellow-600 to-orange-600',    ring: 'ring-amber-500/40',     emoji: '↩️', tagBg: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
  CIERRE:             { gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',      ring: 'ring-fuchsia-500/40',   emoji: '🏁', tagBg: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30' },
  ALEGATO_FINAL:      { gradient: 'from-slate-700 via-slate-800 to-slate-900',      ring: 'ring-slate-500/40',     emoji: '🎤', tagBg: 'bg-slate-500/15 text-slate-200 border-slate-400/30' },
};

const STORAGE_DECK     = (caseId: string) => `litigation-deck:${caseId}`;
const STORAGE_DELIVERED = (caseId: string) => `litigation-deck-delivered:${caseId}`;

interface Props {
  caseId: string;
  /** Open the article lookup with a given reference. Wired by the parent. */
  onLookupArticle?: (ref: string) => void;
}

export function ArgumentDeck({ caseId, onLookupArticle }: Props) {
  const [cards, setCards] = useState<ArgumentCard[]>([]);
  const [active, setActive] = useState(0);
  const [delivered, setDelivered] = useState<Record<number, boolean>>({});
  const [pointDone, setPointDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [presenter, setPresenter] = useState(false);

  // Fingerprint del contexto del caso — usado para detectar staleness
  // de tarjetas (cuando hay nuevos docs, brain refrescado, tareas, etc).
  const [fingerprint, setFingerprint] = useState<LitigationFingerprint | null>(null);
  const [fpLoading, setFpLoading] = useState(false);

  const refetchFingerprint = useCallback(async () => {
    if (!caseId) return;
    setFpLoading(true);
    try {
      const fp = await litigationAPI.fingerprint(caseId);
      setFingerprint(fp);
    } catch { /* silencioso — la sala sigue funcionando sin staleness check */ }
    finally { setFpLoading(false); }
  }, [caseId]);

  // Fetch fingerprint al entrar a la sala + cuando termina de generar tarjetas
  useEffect(() => { void refetchFingerprint(); }, [refetchFingerprint]);

  // Resumen agregado: tarjetas stale + razones únicas
  const staleness = useMemo(() => {
    const perCard = cards.map((c) => staleReasons(c, fingerprint));
    const staleIdx = perCard.map((r, i) => (r.length > 0 ? i : -1)).filter((i) => i >= 0);
    const allReasons = Array.from(new Set(perCard.flat()));
    return { perCard, staleIdx, allReasons };
  }, [cards, fingerprint]);

  // Load persisted deck.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_DECK(caseId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCards(parsed);
      } catch { /* ignore */ }
    }
    const rawDel = window.localStorage.getItem(STORAGE_DELIVERED(caseId));
    if (rawDel) {
      try { setDelivered(JSON.parse(rawDel)); } catch { /* ignore */ }
    }
  }, [caseId]);

  // Persist on change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (cards.length > 0) window.localStorage.setItem(STORAGE_DECK(caseId), JSON.stringify(cards));
  }, [cards, caseId]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_DELIVERED(caseId), JSON.stringify(delivered));
  }, [delivered, caseId]);

  // Keyboard navigation: ← → space.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (cards.length === 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setActive((i) => Math.min(cards.length - 1, i + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === ' ') { e.preventDefault(); setDelivered((d) => ({ ...d, [active]: !d[active] })); }
      else if (e.key.toLowerCase() === 'p') { e.preventDefault(); setPresenter((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards.length, active]);

  const generate = async (slugs?: string[]) => {
    setError('');
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    if (!slugs) {
      setCards([]);
      setDelivered({});
      setPointDone({});
      setActive(0);
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(litigationAPI.cardsUrl(caseId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(slugs ? { slugs } : {}),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = frame.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
            else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              try {
                const json = JSON.parse(data);
                if (currentEvent === 'start') {
                  setProgress({ done: 0, total: json.total ?? 0 });
                } else if (currentEvent === 'card' && json.card) {
                  setCards((prev) => {
                    if (slugs) {
                      const i = prev.findIndex((c) => c.slug === json.card.slug);
                      if (i >= 0) {
                        const next = [...prev];
                        next[i] = json.card;
                        return next;
                      }
                    }
                    return [...prev, json.card];
                  });
                  setProgress((p) => ({ ...p, done: p.done + 1 }));
                } else if (currentEvent === 'error') {
                  setError(json.message || 'Error de IA');
                }
              } catch { /* ignore */ }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message ?? 'Error en la conexión');
    } finally {
      setLoading(false);
      abortRef.current = null;
      // Tras generar, el fingerprint puede haber cambiado (si la generación
      // detonó re-síntesis del brain o creó docs ai_analysis). Lo refrescamos
      // para que el indicador de staleness quede en cero.
      void refetchFingerprint();
    }
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-EC';
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  };

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-violet-950/40 via-slate-900/60 to-slate-900/60 border border-violet-500/30 p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
          <Layers className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Tarjetas argumentales por IA</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Genera un mazo en secuencia: <span className="text-violet-300 font-semibold">apertura</span>,
          <span className="text-sky-300 font-semibold"> hechos</span>,
          <span className="text-indigo-300 font-semibold"> fundamento</span>,
          <span className="text-emerald-300 font-semibold"> prueba</span>,
          <span className="text-orange-300 font-semibold"> refutación</span>,
          <span className="text-amber-300 font-semibold"> réplica</span> y
          <span className="text-fuchsia-300 font-semibold"> cierre</span>.
        </p>
        {error && <p className="text-rose-400 text-xs mt-3">{error}</p>}
        <button
          onClick={() => generate()}
          disabled={loading}
          className={cn(
            'mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all',
            loading
              ? 'bg-slate-800 text-slate-400'
              : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02]',
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando {progress.done}/{progress.total}…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generar mazo
            </>
          )}
        </button>
      </div>
    );
  }

  const card = cards[active];
  const style = SLUG_STYLE[card.slug] ?? SLUG_STYLE.ALEGATO_FINAL;
  const fmtSec = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r.toString().padStart(2, '0')}s` : `${r}s`;
  };

  const togglePoint = (i: number) => setPointDone((d) => ({ ...d, [`${active}:${i}`]: !d[`${active}:${i}`] }));
  const cardComplete = !!delivered[active];

  return (
    <div className={cn('flex flex-col gap-3', presenter && 'absolute inset-0 z-50 bg-slate-950/95 backdrop-blur p-6 overflow-auto')}>
      {/* Banner de staleness global — visible si hay tarjetas obsoletas */}
      {staleness.staleIdx.length > 0 && (
        <div className="rounded-xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-rose-950/40 backdrop-blur p-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 grid place-items-center text-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-amber-200">
              {staleness.staleIdx.length} de {cards.length} tarjetas pueden estar desactualizadas
            </div>
            <div className="text-[11px] text-amber-100/80 mt-0.5 leading-snug">
              Cambios detectados en el expediente: <span className="font-semibold">{staleness.allReasons.join(' · ')}</span>
            </div>
          </div>
          <button
            onClick={() => {
              const slugs = staleness.staleIdx.map((i) => cards[i].slug);
              void generate(slugs);
            }}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Regenerar solo las tarjetas obsoletas con el contexto actualizado"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Actualizar las {staleness.staleIdx.length}
          </button>
          <button
            onClick={() => generate()}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 disabled:opacity-50 transition"
            title="Regenerar TODAS las tarjetas (las obsoletas y las que están al día)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar todo
          </button>
        </div>
      )}

      {/* Indicador de "todas al día" cuando no hay staleness */}
      {fingerprint && cards.length > 0 && staleness.staleIdx.length === 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span><strong>{cards.length} tarjetas al día</strong> · sin cambios pendientes en el expediente</span>
          </div>
          <button
            onClick={() => void refetchFingerprint()}
            disabled={fpLoading}
            className="text-[10px] font-semibold text-emerald-300/80 hover:text-emerald-200 disabled:opacity-50"
            title="Re-verificar estado del expediente"
          >
            {fpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Card navigator strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {cards.map((c, i) => {
          const s = SLUG_STYLE[c.slug] ?? SLUG_STYLE.ALEGATO_FINAL;
          const isActive = i === active;
          const done = !!delivered[i];
          const isStale = staleness.perCard[i]?.length > 0;
          return (
            <button
              key={`${c.slug}-${i}`}
              onClick={() => setActive(i)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all relative',
                isActive
                  ? `bg-gradient-to-br ${s.gradient} text-white border-transparent shadow-md`
                  : `${s.tagBg} hover:opacity-100 ${done ? 'opacity-50' : 'opacity-90'}`,
                done && !isActive && 'line-through',
                isStale && !isActive && 'ring-2 ring-amber-400/60 ring-offset-1 ring-offset-slate-900',
              )}
              title={isStale
                ? `${c.title} — desactualizada: ${staleness.perCard[i].join(', ')}`
                : c.title}
            >
              <span>{i + 1}.</span>
              <span className="leading-none">{s.emoji}</span>
              <span className="uppercase tracking-wider">{c.title}</span>
              {done && !isActive && <CheckCircle2 className="w-3 h-3" />}
              {isStale && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-slate-900" />
              )}
            </button>
          );
        })}
        {loading && (
          <div className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px]">
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress.done}/{progress.total}
          </div>
        )}
      </div>

      {/* The big card */}
      <div className={cn(
        'relative rounded-2xl p-5 lg:p-6 border-2 ring-4 transition-all',
        'bg-gradient-to-br', style.gradient, style.ring,
      )}>
        <div className="absolute inset-0 rounded-2xl pointer-events-none bg-black/10" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none">{style.emoji}</span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Tarjeta {active + 1} de {cards.length}
                </div>
                <h2 className="text-xl lg:text-2xl font-black text-white leading-tight">{card.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/80 bg-white/10 backdrop-blur rounded-full px-2 py-1">
                <Clock className="w-3 h-3" />
                {fmtSec(card.est_seconds)}
              </span>
              <button
                onClick={() => speak(`${card.headline}. ${card.talking_points.join('. ')}`)}
                className="p-1.5 rounded-lg bg-white/10 backdrop-blur text-white/90 hover:bg-white/20 transition-colors"
                title="Leer en voz alta"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => generate([card.slug])}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/10 backdrop-blur text-white/90 hover:bg-white/20 transition-colors disabled:opacity-30"
                title="Regenerar esta tarjeta"
              >
                <RefreshCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Stamp de generación + reasons de staleness */}
          <div className="flex items-center flex-wrap gap-2 text-[10px] font-semibold text-white/70 mb-3">
            {card.generatedAt && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                Generada {relativeTime(card.generatedAt)}
              </span>
            )}
            {staleness.perCard[active]?.length > 0 ? (
              <span className="inline-flex items-center gap-1 bg-amber-500/25 text-amber-100 border border-amber-400/40 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {staleness.perCard[active].length} {staleness.perCard[active].length === 1 ? 'cambio' : 'cambios'} desde su generación
              </span>
            ) : fingerprint && card.generatedAt ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Al día
              </span>
            ) : null}
            {staleness.perCard[active]?.length > 0 && (
              <button
                onClick={() => void generate([card.slug])}
                disabled={loading}
                className="inline-flex items-center gap-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-50 border border-amber-300/50 px-2 py-0.5 rounded-full transition disabled:opacity-50"
                title="Regenerar esta tarjeta con el contexto actualizado"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Actualizar esta
              </button>
            )}
          </div>

          {/* Lista de razones si hay staleness — informativo, una línea */}
          {staleness.perCard[active]?.length > 0 && (
            <div className="text-[11px] text-amber-100/90 mb-3 leading-snug">
              <strong className="text-amber-200">Cambios detectados:</strong> {staleness.perCard[active].join(' · ')}
            </div>
          )}

          <p className="text-base lg:text-lg font-semibold text-white leading-snug italic mb-4 opacity-95">
            "{card.headline}"
          </p>

          <ul className="space-y-2 mb-4">
            {card.talking_points.map((p, i) => {
              const checked = !!pointDone[`${active}:${i}`];
              return (
                <li
                  key={i}
                  onClick={() => togglePoint(i)}
                  className={cn(
                    'group/p flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all backdrop-blur',
                    checked ? 'bg-white/5' : 'bg-white/15 hover:bg-white/20',
                  )}
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-white/60 group-hover/p:text-white shrink-0" />
                  )}
                  <span className={cn('text-[13px] leading-relaxed', checked ? 'line-through text-white/60' : 'text-white')}>
                    {p}
                  </span>
                </li>
              );
            })}
          </ul>

          {card.key_articles?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5">Citas clave</div>
              <div className="flex flex-wrap gap-1.5">
                {card.key_articles.map((a) => (
                  <button
                    key={a}
                    onClick={() => onLookupArticle?.(a)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/30 text-white hover:bg-white/25 transition-colors"
                    title="Abrir artículo en buscador"
                  >
                    <BookMarked className="w-3 h-3" />
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {card.risk && (
            <div className="rounded-lg bg-rose-950/40 border border-rose-400/30 p-2.5 backdrop-blur">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-rose-300 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Riesgo / objeción</div>
                  <p className="text-[12px] text-rose-100 leading-relaxed mt-0.5">{card.risk}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setActive((i) => Math.max(0, i - 1))}
          disabled={active === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDelivered((d) => ({ ...d, [active]: !d[active] }))}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              cardComplete
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                : 'bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white',
            )}
            title="Marcar como expuesta (espacio)"
          >
            {cardComplete ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            {cardComplete ? 'Expuesta' : 'Marcar expuesta'}
          </button>
          <button
            onClick={() => setPresenter((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Modo presentador (P)"
          >
            🔍 {presenter ? 'Salir' : 'Modo presentador'}
          </button>
          <button
            onClick={() => generate()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-violet-500/20 border border-violet-400/40 text-violet-200 hover:bg-violet-500/30 disabled:opacity-30"
            title="Regenerar todo el mazo"
          >
            <RefreshCcw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Regenerar
          </button>
        </div>

        <button
          onClick={() => setActive((i) => Math.min(cards.length - 1, i + 1))}
          disabled={active === cards.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-colors disabled:opacity-30"
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
