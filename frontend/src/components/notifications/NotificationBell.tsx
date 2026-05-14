'use client';

/**
 * NotificationBell — campana en el TopBar del dashboard que muestra
 * count de notificaciones no leídas y un dropdown con las 10 más
 * recientes. Polea cada 60s + escucha el evento 'corpus-update' para
 * refrescar inmediatamente cuando llega una nueva norma.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BookOpen, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  action_url: string | null;
  metadata: any;
  created_at: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = async () => {
    try {
      const r = await api.get<{ count: number; highCount: number }>('/notifications/unread-count');
      setCount(r.data.count);
      setHighCount(r.data.highCount);
    } catch { /* silent — el bell no debe romper la UI */ }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ items: NotifItem[] }>('/notifications?limit=10');
      setItems(r.data.items || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`, {});
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read', {});
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setCount(0);
      setHighCount(0);
    } catch { /* silent */ }
  };

  // Polling cada 60s
  useEffect(() => {
    void refreshCount();
    const t = setInterval(() => { void refreshCount(); }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Click fuera → cerrar
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Cuando abro el dropdown, cargo items
  useEffect(() => {
    if (open) void loadItems();
  }, [open]);

  const handleItemClick = async (item: NotifItem) => {
    if (!item.is_read) await markRead(item.id);
    setOpen(false);
    if (item.action_url) router.push(item.action_url);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition"
        title={count > 0 ? `${count} sin leer` : 'Notificaciones'}
      >
        <Bell className={`w-5 h-5 ${highCount > 0 ? 'text-rose-600 animate-[wiggle_1s_ease-in-out_infinite]' : 'text-slate-600'}`} />
        {count > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black grid place-items-center text-white shadow-sm ${
            highCount > 0 ? 'bg-rose-500' : 'bg-violet-500'
          }`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
              {count > 0 && (
                <p className="text-[10px] text-slate-500 mt-0.5">{count} sin leer</p>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-bold text-violet-700 hover:text-violet-900 hover:underline"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-xs">Cargando…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-semibold">Sin notificaciones</p>
                <p className="text-[11px] mt-1">Te avisaremos cuando haya una nueva ley o algo urgente.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => {
                  const isCorpus = n.type === 'corpus_update';
                  const isHigh = n.priority === 'high' || n.priority === 'critical';
                  const Icon = isCorpus ? BookOpen : AlertTriangle;
                  const date = new Date(n.created_at);
                  const ago = nicelyAgo(date);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleItemClick(n)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-2.5 hover:bg-slate-50 transition ${!n.is_read ? 'bg-violet-50/40' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                          isCorpus ? 'bg-violet-100 text-violet-700' :
                          isHigh   ? 'bg-rose-100 text-rose-700' :
                                     'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs leading-snug ${!n.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'} line-clamp-2`}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-slate-400">{ago}</span>
                            {n.action_url && (
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-center">
            <a
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-violet-700 hover:text-violet-900 hover:underline"
            >
              Ver todas las notificaciones →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function nicelyAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}
