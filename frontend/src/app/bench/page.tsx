'use client';

/**
 * Poweria Bench — página pública.
 *
 * Leaderboard abierto del benchmark de derecho ecuatoriano. Muestra la
 * última evaluación marcada como pública: puntaje global, desglose por
 * materia y dificultad, y resultado tarea por tarea (sin las respuestas).
 *
 * Es una jugada de credibilidad: un benchmark propio del dominio EC,
 * transparente, que ningún competidor generalista publica.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, CheckCircle2, Gauge, Loader2, ScrollText,
  ShieldCheck, Target,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://poweria-legal-api.onrender.com';

interface Aggregate { category: string; avgScore: number; count: number }
interface Run {
  runId: string; model: string; provider: string; useRag: boolean;
  totalTasks: number; completedTasks: number; avgScore: number;
  notes: string | null; completedAt: string | null;
  byCategory: Aggregate[]; byDifficulty: Aggregate[];
}
interface Result {
  taskId: string; category: string; difficulty: string; taskType: string;
  score: number | null; verdict: string | null;
  normsExpected: number; normsFound: number;
  citationsVerified: number; citationsUnverified: number;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado',
};
const TASK_TYPE_LABEL: Record<string, string> = {
  norm_identification: 'Identificación de norma',
  rule_application: 'Aplicación de regla',
  citation_accuracy: 'Exactitud de citas',
  open_analysis: 'Análisis abierto',
};

function scoreColor(s: number | null): string {
  if (s == null) return 'text-slate-400';
  if (s >= 75) return 'text-emerald-600';
  if (s >= 45) return 'text-amber-600';
  return 'text-rose-600';
}
function scoreBg(s: number): string {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 45) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function PublicBenchPage() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/v1/bench/leaderboard`, { cache: 'no-store' });
        const data = await r.json();
        setAvailable(!!data.available);
        setRun(data.run ?? null);
        setResults(data.results ?? []);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft className="h-4 w-4" />
            Poweria Legal
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            Probar Poweria Legal
          </Link>
        </div>
      </header>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-5">
            <Target className="h-3.5 w-3.5" />
            BENCHMARK ABIERTO
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Poweria Bench
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            El primer benchmark abierto de inteligencia artificial aplicada al
            <strong className="text-slate-800"> derecho ecuatoriano</strong>. Medimos, de
            forma transparente, qué tan bien responde nuestro sistema preguntas
            jurídicas reales — y publicamos el resultado.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-12 space-y-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : !available || !run ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
              <ScrollText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Resultados próximamente</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
              {failed
                ? 'No pudimos cargar los resultados en este momento. Volvé a intentarlo en unos minutos.'
                : 'Estamos preparando la primera evaluación pública del benchmark. Vuelve pronto.'}
            </p>
          </div>
        ) : (
          <>
            {/* ─── SCORE HEADLINE ──────────────────────────────────── */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Puntaje global
              </div>
              <div className={`text-7xl font-bold tabular-nums ${scoreColor(run.avgScore)}`}>
                {run.avgScore.toFixed(1)}
                <span className="text-2xl text-slate-300 font-medium"> / 100</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-x-6 gap-y-1 flex-wrap text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" /> {run.completedTasks} tareas evaluadas</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {run.useRag ? 'Con corpus jurídico' : 'Conocimiento base'}</span>
                {run.completedAt && (
                  <span>{new Date(run.completedAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                )}
              </div>
              {run.notes && <p className="mt-3 text-xs text-slate-400 italic">{run.notes}</p>}
            </section>

            {/* ─── BREAKDOWN ───────────────────────────────────────── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BreakdownCard title="Por materia" items={run.byCategory} labelMap={null} />
              <BreakdownCard title="Por dificultad" items={run.byDifficulty} labelMap={DIFFICULTY_LABEL} />
            </section>

            {/* ─── RESULTS TABLE ───────────────────────────────────── */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Resultado tarea por tarea</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cada fila es una tarea jurídica del dataset, calificada de 0 a 100.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Tarea</th>
                      <th className="px-4 py-3 text-left font-semibold">Materia</th>
                      <th className="px-4 py-3 text-left font-semibold">Dificultad</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-center font-semibold">Citas verif.</th>
                      <th className="px-4 py-3 text-right font-semibold">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((r) => (
                      <tr key={r.taskId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.taskId}</td>
                        <td className="px-4 py-3 text-slate-800">{r.category}</td>
                        <td className="px-4 py-3 text-slate-600">{DIFFICULTY_LABEL[r.difficulty] || r.difficulty}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{TASK_TYPE_LABEL[r.taskType] || r.taskType}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-medium">{r.citationsVerified}</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${scoreColor(r.score)}`}>
                          {r.score != null ? r.score.toFixed(0) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ─── METHODOLOGY ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Cómo funciona el benchmark
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MethodStep
              n="1"
              title="Dataset validado"
              desc="Tareas jurídicas reales de derecho ecuatoriano — constitucional, civil, penal, laboral, tributario y societario — en tres niveles de dificultad."
            />
            <MethodStep
              n="2"
              title="Respuesta y verificación"
              desc="El sistema responde cada tarea apoyándose en el corpus jurídico. Cada cita se contrasta automáticamente contra las normas reales del corpus."
            />
            <MethodStep
              n="3"
              title="Calificación con rúbrica"
              desc="Un evaluador califica cada respuesta de 0 a 100 según una rúbrica por tarea: corrección jurídica, fundamentación y ausencia de invención de normas."
            />
          </div>
          <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              El benchmark es una herramienta de control de calidad continuo: cada
              cambio de modelo o de corpus se vuelve a medir contra el mismo dataset.
              Ningún resultado de IA reemplaza el criterio profesional del abogado.
            </p>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 text-center text-sm text-slate-500">
          <p className="font-semibold text-slate-700">Poweria Legal</p>
          <p className="mt-1">Inteligencia artificial jurídica para el Ecuador · por COGNITEX</p>
        </div>
      </footer>
    </div>
  );
}

function BreakdownCard({ title, items, labelMap }: {
  title: string; items: Aggregate[]; labelMap: Record<string, string> | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos.</p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.category} className="flex items-center gap-3">
              <div className="w-28 text-sm text-slate-700 truncate flex-shrink-0">
                {labelMap?.[it.category] || it.category}
              </div>
              <div className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full ${scoreBg(it.avgScore)}`} style={{ width: `${Math.max(2, it.avgScore)}%` }} />
              </div>
              <div className={`w-10 text-right text-sm font-bold tabular-nums ${scoreColor(it.avgScore)}`}>
                {it.avgScore.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MethodStep({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div>
      <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-indigo-600 text-white font-bold text-sm mb-3">
        {n}
      </div>
      <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  );
}
