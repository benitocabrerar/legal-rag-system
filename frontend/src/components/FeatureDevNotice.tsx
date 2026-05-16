'use client';

/**
 * Aviso "Función en desarrollo".
 *
 * Cuando una acción toca un feature que el plan del usuario no incluye, el
 * backend responde con code 'feature_in_development'. El interceptor de
 * `api` emite el evento global `poweria:feature-dev`; este componente —
 * montado una sola vez en el layout del dashboard — muestra un aviso
 * amable en lugar de un error.
 */
import { useEffect, useState } from 'react';
import { Wrench, Sparkles, X } from 'lucide-react';

export function FeatureDevNotice() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMsg(detail?.message || 'Esta función está en desarrollo y estará disponible muy pronto.');
    };
    window.addEventListener('poweria:feature-dev', handler);
    return () => window.removeEventListener('poweria:feature-dev', handler);
  }, []);

  // Cerrar con la tecla Escape.
  useEffect(() => {
    if (!msg) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMsg(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [msg]);

  if (!msg) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setMsg(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Cabecera con gradiente */}
        <div className="relative h-28 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 flex items-center justify-center overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 10px, transparent 10px 20px)',
            }}
          />
          <div className="relative w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/40">
            <Wrench className="h-8 w-8 text-white fdn-wrench" />
          </div>
        </div>

        <button
          onClick={() => setMsg(null)}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-violet-600 mb-2">
            <Sparkles className="h-3 w-3" /> Muy pronto
          </div>
          <h3 className="text-lg font-bold text-gray-900">Función en desarrollo</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{msg}</p>
          <button
            onClick={() => setMsg(null)}
            className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-violet-500/30 transition"
          >
            Entendido
          </button>
        </div>
      </div>

      <style jsx>{`
        .fdn-wrench { animation: fdn-wobble 2.2s ease-in-out infinite; transform-origin: 50% 50%; }
        @keyframes fdn-wobble {
          0%, 60%, 100% { transform: rotate(0deg); }
          70% { transform: rotate(-18deg); }
          80% { transform: rotate(14deg); }
          90% { transform: rotate(-8deg); }
        }
        @media (prefers-reduced-motion: reduce) { .fdn-wrench { animation: none; } }
      `}</style>
    </div>
  );
}
