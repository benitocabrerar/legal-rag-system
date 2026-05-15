'use client';

/**
 * Panel Admin · Dominios de Corpus
 *
 * Gestiona el corpus jurídico como una estructura multi-jurisdicción.
 * Cada dominio (derecho ecuatoriano, inmigración federal EE.UU., …) es
 * un cuerpo de derecho aislado, con sus propias estadísticas de ingesta.
 *
 * Infraestructura de la Fase 3 — deja el sistema listo para sumar el
 * corpus de inmigración de EE.UU. sin contaminar el corpus ecuatoriano.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle, CheckCircle2, Database, Globe, Layers, Loader2, RefreshCw,
  Star, XCircle,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface CorpusDomain {
  code: string;
  name: string;
  countryCode: string;
  language: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  docCount: number;
  chunkCount: number;
}

const LANG_LABEL: Record<string, string> = { es: 'Español', en: 'Inglés' };

// ─── PAGE ─────────────────────────────────────────────────────────────────
export default function CorpusDomainsPage() {
  const [domains, setDomains] = useState<CorpusDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const r = await api.get<{ domains: CorpusDomain[] }>('/corpus-domains');
      setDomains(r.data.domains ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar los dominios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchDomain = async (code: string, body: Record<string, unknown>) => {
    setBusy(code);
    setError('');
    try {
      await api.patch(`/corpus-domains/${code}`, body);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo actualizar el dominio');
    } finally {
      setBusy(null);
    }
  };

  const totalDocs = domains.reduce((s, d) => s + d.docCount, 0);
  const totalChunks = domains.reduce((s, d) => s + d.chunkCount, 0);
  const activeCount = domains.filter((d) => d.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-md">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dominios de Corpus</h1>
            <p className="text-sm text-gray-500">
              El corpus jurídico como estructura multi-jurisdicción
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {/* ─── KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Layers className="h-5 w-5" />} label="Dominios" value={String(domains.length)} sub={`${activeCount} activos`} color="indigo" />
        <Kpi icon={<Database className="h-5 w-5" />} label="Documentos" value={totalDocs.toLocaleString('es-EC')} sub="en todo el corpus" color="sky" />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Chunks vectorizados" value={totalChunks.toLocaleString('es-EC')} sub="indexados para RAG" color="violet" />
        <Kpi icon={<Globe className="h-5 w-5" />} label="Jurisdicciones" value={String(new Set(domains.map((d) => d.countryCode)).size)} sub="países representados" color="emerald" />
      </div>

      {/* ─── DOMAIN CARDS ───────────────────────────────────────── */}
      <div className="space-y-4">
        {domains.map((d) => {
          const empty = d.docCount === 0;
          return (
            <div key={d.code} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">{d.name}</h2>
                    {d.isDefault && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
                        <Star className="h-3 w-3" /> POR DEFECTO
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded ${
                      d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {d.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-mono">
                    <span>{d.code}</span>
                    <span>·</span>
                    <span>{d.countryCode}</span>
                    <span>·</span>
                    <span>{LANG_LABEL[d.language] || d.language}</span>
                  </div>
                  {d.description && (
                    <p className="text-sm text-gray-600 mt-2 max-w-2xl">{d.description}</p>
                  )}
                </div>
                {/* Stats */}
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 tabular-nums">{d.docCount}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">documentos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 tabular-nums">{d.chunkCount.toLocaleString('es-EC')}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">chunks</div>
                  </div>
                </div>
              </div>

              {/* Estado de ingesta */}
              {empty && (
                <div className="mx-5 mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Pendiente de ingesta.</strong> Este dominio está registrado pero
                    todavía no tiene fuentes cargadas. Cuando se ingesten documentos
                    etiquetados con <code className="bg-white px-1 rounded">{d.code}</code>,
                    aparecerán acá y la búsqueda RAG podrá acotarse a este corpus.
                  </div>
                </div>
              )}

              {/* Controles */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => patchDomain(d.code, { isActive: !d.isActive })}
                  disabled={busy === d.code}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50 ${
                    d.isActive
                      ? 'text-rose-700 bg-white border border-rose-200 hover:bg-rose-50'
                      : 'text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  {busy === d.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {d.isActive ? 'Desactivar' : 'Activar'}
                </button>
                {!d.isDefault && d.isActive && (
                  <button
                    onClick={() => patchDomain(d.code, { isDefault: true })}
                    disabled={busy === d.code}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Marcar por defecto
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── INFO PANEL ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl border border-sky-200 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white shadow-sm">
            <Globe className="h-5 w-5 text-sky-600" />
          </div>
          <div className="flex-1 text-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Cómo funciona el corpus multi-jurisdicción</h3>
            <p className="text-gray-700 mb-2">
              Cada documento del corpus está etiquetado con un dominio. La recuperación
              RAG puede acotarse a un dominio, de modo que el corpus ecuatoriano y el
              corpus de inmigración de EE.UU. no se contaminan entre sí.
            </p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li><strong>ec-general</strong> — el corpus jurídico ecuatoriano actual.</li>
              <li><strong>us-immigration</strong> — derecho migratorio federal de EE.UU.
                (CFR Título 8, USCIS, BIA, Boletín de Visas). Listo para recibir la ingesta
                de fuentes cuando estén disponibles.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────
function Kpi({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  const map: Record<string, { bg: string; text: string }> = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-600' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  };
  const c = map[color] || map.indigo;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${c.bg} ${c.text}`}>{icon}</div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div>}
    </div>
  );
}
