'use client';

/**
 * UserClock — Display siempre visible en el dashboard layout con:
 *   - Nombre del usuario (saludo según hora del día)
 *   - Fecha actual completa en español ecuatoriano
 *   - Hora hh:mm:ss actualizada cada segundo
 *
 * Diseño: pill horizontal en el header con tipografía tabular-nums para
 * evitar saltos visuales al avanzar los segundos. Responsive — en mobile
 * colapsa a versión compacta sin segundos.
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  userName?: string | null;
  /** Versión compacta cuando hay poco espacio en el header. */
  compact?: boolean;
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
  // "Benito Cabrera" → "Benito"; "benitocabrerar@gmail.com" → "Benito"
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0];
    // Si parece "benitocabrerar", capitalizar primera letra
    return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0];
  }
  return trimmed.split(/\s+/)[0];
}

export function UserClock({ userName, compact = false }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    // SSR placeholder: mantenemos el footprint para evitar layout shift
    return (
      <div
        className={`hidden md:flex items-center gap-3 rounded-xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 via-white to-fuchsia-50/80 px-4 py-2 shadow-sm select-none ${compact ? '' : 'min-w-[280px]'}`}
        aria-hidden="true"
      >
        <Clock className="w-4 h-4 text-indigo-500" />
        <div className="text-xs text-indigo-700/70">Sincronizando reloj…</div>
      </div>
    );
  }

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const day = DAYS[now.getDay()];
  const date = now.getDate();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  const name = firstName(userName);
  const hello = greeting(now.getHours());

  // ─── Versión compacta (solo hora + nombre) ───
  if (compact) {
    return (
      <div
        className="hidden md:flex items-center gap-2 rounded-lg border border-indigo-200/60 bg-white/80 backdrop-blur px-3 py-1.5 shadow-sm select-none"
        title={`${day}, ${date} de ${month} de ${year}`}
      >
        <Clock className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-mono text-sm font-bold text-indigo-700 tabular-nums">
          {hh}:{mm}<span className="text-indigo-400">:{ss}</span>
        </span>
        {name && <span className="text-xs font-semibold text-gray-700 max-w-[90px] truncate">· {name}</span>}
      </div>
    );
  }

  // ─── Versión completa (header dashboard) ───
  return (
    <div
      className="hidden md:flex items-center gap-3 rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50 px-4 py-2 shadow-sm select-none"
      role="status"
      aria-label={`${hello}${name ? ', ' + name : ''}. ${day} ${date} de ${month} de ${year}, ${hh}:${mm}`}
    >
      {/* Hora grande */}
      <div className="flex flex-col items-end leading-none">
        <div className="font-mono text-2xl font-black tabular-nums text-transparent bg-gradient-to-br from-indigo-700 via-fuchsia-600 to-purple-700 bg-clip-text">
          {hh}<span className="text-indigo-400">:</span>{mm}<span className="text-xl text-indigo-400">:{ss}</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600/80 mt-0.5">
          Hora del Ecuador
        </div>
      </div>

      {/* Separador */}
      <div className="h-9 w-px bg-gradient-to-b from-transparent via-indigo-300 to-transparent" />

      {/* Fecha + saludo */}
      <div className="flex flex-col leading-tight">
        <div className="text-[13px] font-bold text-gray-900 capitalize">
          {hello}{name ? <span className="text-indigo-700">, {name}</span> : ''}
        </div>
        <div className="text-[11px] text-gray-600 capitalize">
          {day} {date} de {month} {year}
        </div>
      </div>
    </div>
  );
}

export default UserClock;
