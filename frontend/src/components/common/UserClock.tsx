'use client';

/**
 * UserClock — widget flotante fijo en esquina inferior izquierda.
 *
 * Decisión de UX: se sacó del header porque competía con el menú principal
 * y tapaba opciones en pantallas medianas. Ahora vive como pill flotante,
 * con z-index bajo para que dialogs/modals lo cubran sin problema.
 *
 * Estados:
 *   - Expandido (default): hora HH:MM:SS + fecha + saludo + nombre
 *   - Colapsado: solo un puntito con la hora — se activa al hacer click
 *   - Hidden en mobile (md-): el header móvil ya no usa este componente
 */

import { useEffect, useState } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  userName?: string | null;
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function greeting(hour: number): string {
  if (hour < 6)  return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function firstName(full?: string | null): string {
  if (!full) return '';
  const trimmed = full.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0];
  }
  return trimmed.split(/\s+/)[0];
}

const STORAGE_KEY = 'poweria-userclock-collapsed';

export function UserClock({ userName }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === '1') setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  if (!now) return null;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const day = DAYS[now.getDay()];
  const date = now.getDate();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const name = firstName(userName);
  const hello = greeting(now.getHours());
  const shortDate = `${day.slice(0, 3)} ${date} ${month.slice(0, 3)}`;

  // ─── Colapsado: solo pildora pequeña con hora ───
  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-4 left-4 z-30 hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur shadow-lg border border-slate-200/80 px-3 py-1.5 hover:bg-white transition group select-none"
        title={`Mostrar reloj completo · ${day} ${date} de ${month} ${year}`}
      >
        <Clock className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-mono text-sm font-black text-indigo-700 tabular-nums">
          {hh}:{mm}
        </span>
        <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
      </button>
    );
  }

  // ─── Expandido: card flotante ───
  return (
    <div
      className="fixed bottom-4 left-4 z-30 hidden md:flex items-stretch gap-2 rounded-xl bg-white/95 backdrop-blur shadow-xl shadow-indigo-900/10 border border-slate-200/80 px-3 py-2 select-none animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="status"
      aria-label={`${hello}${name ? ', ' + name : ''}. ${day} ${date} de ${month} de ${year}, ${hh}:${mm}`}
    >
      {/* Hora grande tabular-nums */}
      <div className="flex flex-col items-start leading-none pr-2.5 border-r border-slate-200">
        <div className="font-mono text-lg font-black tabular-nums text-indigo-700 leading-none">
          {hh}<span className="text-indigo-400">:</span>{mm}<span className="text-sm text-indigo-400 ml-0.5">:{ss}</span>
        </div>
        <div className="text-[10px] capitalize text-slate-500 font-bold mt-1 tracking-tight">
          {shortDate}
        </div>
      </div>

      {/* Saludo + nombre */}
      <div className="flex flex-col leading-tight justify-center min-w-[80px]">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{hello}</div>
        {name && <div className="text-[12px] font-bold text-indigo-700 truncate max-w-[110px]">{name}</div>}
      </div>

      {/* Botón colapsar */}
      <button
        onClick={toggle}
        className="self-start ml-0.5 text-slate-400 hover:text-slate-700 transition"
        title="Minimizar reloj"
        aria-label="Minimizar reloj"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default UserClock;
