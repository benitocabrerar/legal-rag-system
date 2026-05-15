'use client';

/**
 * TelegramConnectCard — tarjeta de Configuración para vincular la cuenta
 * del usuario con el bot de Telegram de Poweria Legal.
 *
 * Flujo:
 *  1. POST /telegram/link/start → token + deep link.
 *  2. Se abre t.me/<bot>?start=<token> (botón / QR).
 *  3. El usuario confirma en Telegram; el webhook crea el vínculo.
 *  4. La card hace polling de GET /telegram/link/status hasta detectar
 *     `linked: true` y muestra el estado + preferencias.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/get-auth-token';
import {
  Send, Loader2, CheckCircle2, Link2, Link2Off, RefreshCw, AlertTriangle,
} from 'lucide-react';

interface LinkPrefs {
  corpus: boolean;
  cases: boolean;
  calendar: boolean;
  tasks: boolean;
}
interface LinkStatus {
  configured: boolean;
  botUsername: string;
  linked: boolean;
  link: {
    username: string | null;
    firstName: string | null;
    linkedAt: string;
    prefs: LinkPrefs;
  } | null;
}

const PREF_LABELS: Array<{ key: keyof LinkPrefs; label: string; icon: string }> = [
  { key: 'corpus',   label: 'Normas nuevas del corpus',  icon: '📚' },
  { key: 'cases',    label: 'Novedades en casos',         icon: '⚖️' },
  { key: 'calendar', label: 'Agenda y audiencias',        icon: '📅' },
  { key: 'tasks',    label: 'Tareas',                     icon: '✅' },
];

async function authFetch(path: string, init?: RequestInit) {
  const token = await getAuthToken();
  return fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
}

export function TelegramConnectCard() {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const r = await authFetch('/telegram/link/status');
      if (r.ok) setStatus(await r.json());
      else setError('No se pudo cargar el estado de Telegram.');
    } catch {
      setError('No se pudo cargar el estado de Telegram.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadStatus]);

  // Polling mientras se espera la confirmación en Telegram
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks++;
      try {
        const r = await authFetch('/telegram/link/status');
        if (r.ok) {
          const data: LinkStatus = await r.json();
          if (data.linked) {
            setStatus(data);
            setWaiting(false);
            setDeepLink(null);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch { /* keep polling */ }
      // Detener tras ~3 min (token expira a los 15, pero el usuario quizá abandonó)
      if (ticks > 90 && pollRef.current) {
        clearInterval(pollRef.current);
        setWaiting(false);
      }
    }, 2000);
  }, []);

  const handleConnect = async () => {
    setError('');
    setStarting(true);
    try {
      const r = await authFetch('/telegram/link/start', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'No se pudo iniciar la vinculación.');
        return;
      }
      setDeepLink(data.deepLink);
      setWaiting(true);
      startPolling();
      // Abrir Telegram en una pestaña nueva
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
    } catch {
      setError('No se pudo iniciar la vinculación.');
    } finally {
      setStarting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desvincular tu cuenta de Telegram? Dejarás de recibir notificaciones ahí.')) return;
    setError('');
    try {
      const r = await authFetch('/telegram/link', { method: 'DELETE' });
      if (r.ok) {
        setWaiting(false);
        setDeepLink(null);
        await loadStatus();
      } else {
        setError('No se pudo desvincular.');
      }
    } catch {
      setError('No se pudo desvincular.');
    }
  };

  const togglePref = async (key: keyof LinkPrefs) => {
    if (!status?.link) return;
    const next = !status.link.prefs[key];
    setSavingPref(key);
    // Optimistic
    setStatus((s) => s && s.link
      ? { ...s, link: { ...s.link, prefs: { ...s.link.prefs, [key]: next } } }
      : s);
    try {
      const r = await authFetch('/telegram/link/prefs', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: next }),
      });
      if (!r.ok) await loadStatus(); // revertir si falló
    } catch {
      await loadStatus();
    } finally {
      setSavingPref(null);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center gap-3 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando integración con Telegram…</span>
      </div>
    );
  }

  // Telegram no configurado en el server
  if (status && !status.configured) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
            <Send className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Telegram</h2>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          La integración con Telegram aún no está habilitada. El equipo de
          Poweria Legal la activará próximamente.
        </p>
      </div>
    );
  }

  const linked = status?.linked && status.link;

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Telegram</h2>
            <p className="text-sm text-gray-500">
              Recibí notificaciones y consultá al asistente jurídico desde Telegram.
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          linked ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
        }`}>
          {linked ? 'Vinculado' : 'Sin vincular'}
        </span>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ─── NO VINCULADO ─────────────────────────────────────────── */}
      {!linked && (
        <div className="mt-5">
          {!waiting ? (
            <>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-4">
                <li>📚 Avisos cuando se publican normas nuevas en el corpus.</li>
                <li>⚖️ Novedades de tus casos, agenda y tareas.</li>
                <li>💬 Consultas jurídicas en lenguaje natural, respondidas con el corpus.</li>
              </ul>
              <button
                onClick={handleConnect}
                disabled={starting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 transition"
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conectar Telegram
              </button>
            </>
          ) : (
            <div className="p-4 rounded-lg bg-sky-50 border border-sky-200">
              <div className="flex items-center gap-2 text-sky-800 font-medium mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Esperando confirmación en Telegram…
              </div>
              <p className="text-sm text-sky-700 mb-3">
                Se abrió Telegram en otra pestaña. Tocá <b>«Iniciar»</b> /
                <b> «Start»</b> en el chat con el bot para confirmar.
                Esta página se actualiza sola cuando termines.
              </p>
              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900 underline"
                >
                  <Send className="h-3.5 w-3.5" />
                  Volver a abrir el chat de Telegram
                </a>
              )}
              <div className="mt-3">
                <button
                  onClick={() => { setWaiting(false); setDeepLink(null); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── VINCULADO ────────────────────────────────────────────── */}
      {linked && status?.link && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Conectado como{' '}
            <b>
              {status.link.firstName || status.link.username
                ? `${status.link.firstName ?? ''}${status.link.username ? ` (@${status.link.username})` : ''}`.trim()
                : 'usuario de Telegram'}
            </b>
            {' · '}
            <span className="text-gray-500">
              desde {new Date(status.link.linkedAt).toLocaleDateString('es-EC')}
            </span>
          </div>

          {/* Preferencias */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              ¿Qué querés recibir por Telegram?
            </h3>
            <div className="space-y-2">
              {PREF_LABELS.map(({ key, label, icon }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <span className="text-sm text-gray-700">
                    <span className="mr-2">{icon}</span>{label}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePref(key)}
                    disabled={savingPref === key}
                    aria-pressed={status.link!.prefs[key]}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                      status.link!.prefs[key] ? 'bg-sky-600' : 'bg-gray-300'
                    } disabled:opacity-60`}
                  >
                    <span
                      className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                        status.link!.prefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
            >
              <Link2Off className="h-4 w-4" />
              Desvincular
            </button>
            <button
              onClick={() => loadStatus()}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
