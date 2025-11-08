import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'N/A';

  return dateObj.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'N/A';

  return dateObj.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
