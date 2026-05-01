/**
 * Calendar helpers — date math via date-fns, plus the visual language for
 * EventType (color, gradient, icon, Spanish label).
 *
 * One source of truth so MonthView / WeekView / DayView / AgendaView /
 * MiniCalendar all read from the same palette.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format as fmt,
  isSameDay,
  isSameMonth,
  isToday as fnsIsToday,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type EventType =
  | 'HEARING'
  | 'MEETING'
  | 'DEADLINE'
  | 'CONSULTATION'
  | 'COURT_DATE'
  | 'DOCUMENT_FILING'
  | 'MEDIATION'
  | 'DEPOSITION'
  | 'OTHER';

export interface EventLite {
  id: string;
  title: string;
  type: EventType;
  status?: string;
  startTime: string;
  endTime: string;
  caseId?: string | null;
  description?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  color?: string | null;
  isPrivate?: boolean;
  allDay?: boolean;
}

export const EVENT_STYLE: Record<
  EventType,
  { bg: string; text: string; border: string; dot: string; gradient: string; label: string; icon: string }
> = {
  HEARING:        { bg: 'bg-violet-100',  text: 'text-violet-900',  border: 'border-violet-300',  dot: 'bg-violet-500',  gradient: 'from-violet-500 to-purple-500',   label: 'Audiencia',    icon: '⚖️' },
  COURT_DATE:     { bg: 'bg-indigo-100',  text: 'text-indigo-900',  border: 'border-indigo-300',  dot: 'bg-indigo-500',  gradient: 'from-indigo-500 to-blue-500',     label: 'Día de juicio',icon: '🏛️' },
  MEETING:        { bg: 'bg-sky-100',     text: 'text-sky-900',     border: 'border-sky-300',     dot: 'bg-sky-500',     gradient: 'from-sky-500 to-cyan-500',         label: 'Reunión',      icon: '👥' },
  DEADLINE:       { bg: 'bg-rose-100',    text: 'text-rose-900',    border: 'border-rose-300',    dot: 'bg-rose-500',    gradient: 'from-rose-500 to-red-500',         label: 'Plazo',        icon: '⏰' },
  CONSULTATION:   { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500',     label: 'Consulta',     icon: '💬' },
  DOCUMENT_FILING:{ bg: 'bg-amber-100',   text: 'text-amber-900',   border: 'border-amber-300',   dot: 'bg-amber-500',   gradient: 'from-amber-500 to-orange-500',     label: 'Presentación', icon: '📄' },
  MEDIATION:      { bg: 'bg-teal-100',    text: 'text-teal-900',    border: 'border-teal-300',    dot: 'bg-teal-500',    gradient: 'from-teal-500 to-cyan-500',        label: 'Mediación',    icon: '🤝' },
  DEPOSITION:     { bg: 'bg-orange-100',  text: 'text-orange-900',  border: 'border-orange-300', dot: 'bg-orange-500',   gradient: 'from-orange-500 to-rose-500',      label: 'Declaración',  icon: '🎤' },
  OTHER:          { bg: 'bg-slate-100',   text: 'text-slate-900',   border: 'border-slate-300',  dot: 'bg-slate-400',    gradient: 'from-slate-500 to-slate-600',      label: 'Otro',         icon: '📌' },
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_STYLE) as EventType[];

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
export const WEEKDAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
export const WEEKDAY_NAMES_LONG = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export function getMonthGrid(anchor: Date): Date[][] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function eventsOnDate(events: EventLite[], date: Date): EventLite[] {
  return events
    .filter((e) => {
      const start = parseISO(e.startTime);
      return isSameDay(start, date);
    })
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
}

export function eventsBetween(events: EventLite[], from: Date, to: Date): EventLite[] {
  return events
    .filter((e) => {
      const start = parseISO(e.startTime);
      return isWithinInterval(start, { start: from, end: to });
    })
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
}

/** Re-base an event's start/end onto a new date keeping the time-of-day. */
export function moveEventToDate(event: EventLite, newDate: Date): { startTime: string; endTime: string } {
  const start = parseISO(event.startTime);
  const end = parseISO(event.endTime);
  const duration = differenceInMinutes(end, start);

  const next = new Date(newDate);
  next.setHours(start.getHours(), start.getMinutes(), 0, 0);
  const nextEnd = new Date(next.getTime() + duration * 60_000);

  return { startTime: next.toISOString(), endTime: nextEnd.toISOString() };
}

export function formatLong(d: Date) { return fmt(d, "EEEE d 'de' MMMM, yyyy", { locale: es }); }
export function formatMonth(d: Date) { return fmt(d, "MMMM yyyy", { locale: es }); }
export function formatTime(d: Date)  { return fmt(d, 'HH:mm'); }
export function formatDay(d: Date)   { return fmt(d, "d 'de' MMMM", { locale: es }); }

export {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek,
  isSameDay, isSameMonth, fnsIsToday as isToday, parseISO,
  startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks,
};
