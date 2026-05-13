// Design System Tokens
// Complete design token system for the Legal AI Dashboard

export const legalTypeColors = {
  penal: {
    primary: '#b91c1c',
    light: '#fecaca',
    dark: '#7f1d1d',
    bgLight: '#fee2e2',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
  },
  civil: {
    primary: '#2563eb',
    light: '#bfdbfe',
    dark: '#1e3a8a',
    bgLight: '#dbeafe',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
  },
  constitucional: {
    primary: '#9333ea',
    light: '#e9d5ff',
    dark: '#581c87',
    bgLight: '#f3e8ff',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
  },
  transito: {
    primary: '#ca8a04',
    light: '#fef08a',
    dark: '#713f12',
    bgLight: '#fef3c7',
    gradient: 'linear-gradient(135deg, #ca8a04 0%, #facc15 100%)',
  },
  administrativo: {
    primary: '#4b5563',
    light: '#d1d5db',
    dark: '#1f2937',
    bgLight: '#f3f4f6',
    gradient: 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)',
  },
  laboral: {
    primary: '#16a34a',
    light: '#bbf7d0',
    dark: '#14532d',
    bgLight: '#d1fae5',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
  },
  tributario: {
    primary: '#0891b2',
    light: '#a5f3fc',
    dark: '#164e63',
    bgLight: '#cffafe',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
  },
  mercantil: {
    primary: '#7c3aed',
    light: '#ddd6fe',
    dark: '#4c1d95',
    bgLight: '#ede9fe',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  },
  familia: {
    primary: '#ec4899',
    light: '#fbcfe8',
    dark: '#831843',
    bgLight: '#fce7f3',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
  },
  inquilinato: {
    primary: '#f97316',
    light: '#fed7aa',
    dark: '#7c2d12',
    bgLight: '#ffedd5',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  },
  ambiental: {
    primary: '#15803d',
    light: '#bbf7d0',
    dark: '#14532d',
    bgLight: '#dcfce7',
    gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
  },
  propiedad_intelectual: {
    primary: '#a16207',
    light: '#fef3c7',
    dark: '#713f12',
    bgLight: '#fef9c3',
    gradient: 'linear-gradient(135deg, #a16207 0%, #eab308 100%)',
  },
  societario: {
    primary: '#0e7490',
    light: '#a5f3fc',
    dark: '#155e75',
    bgLight: '#cffafe',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
  },
  notarial: {
    primary: '#6366f1',
    light: '#c7d2fe',
    dark: '#312e81',
    bgLight: '#e0e7ff',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
  },
  agrario: {
    primary: '#84cc16',
    light: '#d9f99d',
    dark: '#3f6212',
    bgLight: '#ecfccb',
    gradient: 'linear-gradient(135deg, #84cc16 0%, #a3e635 100%)',
  },
  internacional: {
    primary: '#0f766e',
    light: '#99f6e4',
    dark: '#134e4a',
    bgLight: '#ccfbf1',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  },
} as const;

export type LegalType = keyof typeof legalTypeColors;

export const legalTypeConfig = {
  penal: {
    id: 'penal',
    label: 'Penal',
    icon: '⚖️',
    color: legalTypeColors.penal.primary,
    bgLight: legalTypeColors.penal.bgLight,
  },
  civil: {
    id: 'civil',
    label: 'Civil',
    icon: '🏛️',
    color: legalTypeColors.civil.primary,
    bgLight: legalTypeColors.civil.bgLight,
  },
  constitucional: {
    id: 'constitucional',
    label: 'Constitucional',
    icon: '📜',
    color: legalTypeColors.constitucional.primary,
    bgLight: legalTypeColors.constitucional.bgLight,
  },
  transito: {
    id: 'transito',
    label: 'Tránsito',
    icon: '🚗',
    color: legalTypeColors.transito.primary,
    bgLight: legalTypeColors.transito.bgLight,
  },
  administrativo: {
    id: 'administrativo',
    label: 'Administrativo',
    icon: '🏢',
    color: legalTypeColors.administrativo.primary,
    bgLight: legalTypeColors.administrativo.bgLight,
  },
  laboral: {
    id: 'laboral',
    label: 'Laboral',
    icon: '💼',
    color: legalTypeColors.laboral.primary,
    bgLight: legalTypeColors.laboral.bgLight,
  },
  tributario: {
    id: 'tributario',
    label: 'Tributario',
    icon: '🧾',
    color: legalTypeColors.tributario.primary,
    bgLight: legalTypeColors.tributario.bgLight,
  },
  mercantil: {
    id: 'mercantil',
    label: 'Mercantil',
    icon: '🤝',
    color: legalTypeColors.mercantil.primary,
    bgLight: legalTypeColors.mercantil.bgLight,
  },
  familia: {
    id: 'familia',
    label: 'Familia y Niñez',
    icon: '👨‍👩‍👧',
    color: legalTypeColors.familia.primary,
    bgLight: legalTypeColors.familia.bgLight,
  },
  inquilinato: {
    id: 'inquilinato',
    label: 'Inquilinato',
    icon: '🏠',
    color: legalTypeColors.inquilinato.primary,
    bgLight: legalTypeColors.inquilinato.bgLight,
  },
  ambiental: {
    id: 'ambiental',
    label: 'Ambiental',
    icon: '🌿',
    color: legalTypeColors.ambiental.primary,
    bgLight: legalTypeColors.ambiental.bgLight,
  },
  propiedad_intelectual: {
    id: 'propiedad_intelectual',
    label: 'Propiedad Intelectual',
    icon: '💡',
    color: legalTypeColors.propiedad_intelectual.primary,
    bgLight: legalTypeColors.propiedad_intelectual.bgLight,
  },
  societario: {
    id: 'societario',
    label: 'Societario',
    icon: '🏛️',
    color: legalTypeColors.societario.primary,
    bgLight: legalTypeColors.societario.bgLight,
  },
  notarial: {
    id: 'notarial',
    label: 'Notarial',
    icon: '🖋️',
    color: legalTypeColors.notarial.primary,
    bgLight: legalTypeColors.notarial.bgLight,
  },
  agrario: {
    id: 'agrario',
    label: 'Agrario',
    icon: '🌾',
    color: legalTypeColors.agrario.primary,
    bgLight: legalTypeColors.agrario.bgLight,
  },
  internacional: {
    id: 'internacional',
    label: 'Internacional',
    icon: '🌐',
    color: legalTypeColors.internacional.primary,
    bgLight: legalTypeColors.internacional.bgLight,
  },
  todos: {
    id: 'todos',
    label: 'Todos',
    icon: '📁',
    color: '#6b7280',
    bgLight: '#f3f4f6',
  },
} as const;

export const priorityConfig = {
  high: {
    label: 'ALTA PRIORIDAD',
    color: '#991b1b',
    bg: '#fee2e2',
    border: '#fecaca',
  },
  medium: {
    label: 'MEDIA PRIORIDAD',
    color: '#92400e',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  low: {
    label: 'BAJA PRIORIDAD',
    color: '#3730a3',
    bg: '#e0e7ff',
    border: '#c7d2fe',
  },
} as const;

export type Priority = keyof typeof priorityConfig;

export const statusConfig = {
  active: {
    label: 'Activo',
    color: '#065f46',
    bg: '#d1fae5',
  },
  pending: {
    label: 'Pendiente',
    color: '#92400e',
    bg: '#fef3c7',
  },
  closed: {
    label: 'Cerrado',
    color: '#374151',
    bg: '#e5e7eb',
  },
  archived: {
    label: 'Archivado',
    color: '#6b7280',
    bg: '#f3f4f6',
  },
} as const;

export type CaseStatus = keyof typeof statusConfig;

export const brandColors = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  },
  gradientBrand: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  gradientAI: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
} as const;

export const spacing = {
  cardPadding: '1.5rem',
  sectionGap: '2rem',
  elementGap: '1rem',
} as const;

export const shadows = {
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  cardHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;
