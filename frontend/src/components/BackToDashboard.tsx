'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface BackToDashboardProps {
  to?: string;
  label?: string;
  className?: string;
}

export function BackToDashboard({
  to = '/dashboard',
  label,
  className = '',
}: BackToDashboardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const computedLabel = label ?? t('pricing.backToDashboard');
  return (
    <button
      onClick={() => router.push(to)}
      className={`inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      {computedLabel}
    </button>
  );
}
