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
      <div className="hidden lg:flex items-center gap-2.5 select-none opacity-0" aria-hidden="true">
        <div className="font-mono text-lg font-black tabular-nums">--:--:--</div>
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
  // Compact + transparent: solo hora grande + fecha corta, sin background
  // opaco para no tapar elementos del navbar. Mismo footprint en desktop pero
  // sin caja visible — el pill desaparece sobre el header blanco.
  const shortDate = `${day.slice(0, 3)} ${date} ${month.slice(0, 3)}`;
  return (
    <div
      className="hidden lg:flex items-center gap-2.5 select-none"
      role="status"
      aria-label={`${hello}${name ? ', ' + name : ''}. ${day} ${date} de ${month} de ${year}, ${hh}:${mm}`}
      title={`${hello}${name ? ', ' + name : ''} · ${day} ${date} de ${month} de ${year}`}
    >
      {/* Hora grande, sin fondo */}
      <div className="flex flex-col items-end leading-none">
        <div className="font-mono text-lg font-black tabular-nums text-indigo-700">
          {hh}<span className="text-indigo-400">:</span>{mm}<span className="text-sm text-indigo-400 ml-0.5">:{ss}</span>
        </div>
        <div className="text-[10px] capitalize text-slate-500 font-semibold mt-0.5 tracking-tight">
          {shortDate}
        </div>
      </div>
      {/* Saludo + nombre — solo en pantallas anchas */}
      {name && (
        <>
          <div className="h-7 w-px bg-slate-200" />
          <div className="flex flex-col leading-tight">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{hello}</div>
            <div className="text-[12px] font-bold text-indigo-700 truncate max-w-[100px]">{name}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default UserClock;
