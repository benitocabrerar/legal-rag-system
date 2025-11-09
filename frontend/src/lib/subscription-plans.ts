/**
 * Subscription Plans Configuration
 * Defines all available subscription tiers and their features
 */

export interface PlanFeatures {
  aiQueries: number; // -1 = unlimited
  documents: number;
  storage: number; // GB
  cases: number;
  support: 'basic' | 'priority' | 'dedicated';
  analytics?: boolean;
  customIntegrations?: boolean;
  sla?: boolean;
}

export interface SubscriptionPlan {
  code: string;
  name: string;
  nameEnglish: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  savingsPercent: number;
  color: string;
  gradient: string;
  popular?: boolean;
  features: string[];
  limits: PlanFeatures;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    code: 'free',
    name: 'Gratis',
    nameEnglish: 'Free',
    description: 'Perfecto para empezar y probar la plataforma',
    priceMonthly: 0,
    priceYearly: 0,
    savingsPercent: 0,
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
    features: [
      '100 consultas IA / mes',
      '10 documentos',
      '1 GB almacenamiento',
      '5 casos activos',
      'Soporte básico',
      'Búsqueda legal básica'
    ],
    limits: {
      aiQueries: 100,
      documents: 10,
      storage: 1,
      cases: 5,
      support: 'basic'
    }
  },
  professional: {
    code: 'professional',
    name: 'Profesional',
    nameEnglish: 'Professional',
    description: 'Para abogados y bufetes en crecimiento',
    priceMonthly: 29,
    priceYearly: 290,
    savingsPercent: 17,
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    popular: true,
    features: [
      'Consultas IA ilimitadas',
      '500 documentos',
      '50 GB almacenamiento',
      'Casos ilimitados',
      'Soporte prioritario',
      'Analíticas avanzadas',
      'Exportación de datos',
      'Integraciones básicas'
    ],
    limits: {
      aiQueries: -1,
      documents: 500,
      storage: 50,
      cases: -1,
      support: 'priority',
      analytics: true
    }
  },
  enterprise: {
    code: 'enterprise',
    name: 'Empresa',
    nameEnglish: 'Enterprise',
    description: 'Para grandes bufetes y departamentos legales',
    priceMonthly: 99,
    priceYearly: 990,
    savingsPercent: 17,
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    features: [
      'Todo en Profesional',
      'Documentos ilimitados',
      '500 GB almacenamiento',
      'Soporte dedicado 24/7',
      'Integraciones personalizadas',
      'SLA garantizado',
      'Capacitación personalizada',
      'API dedicada',
      'White labeling'
    ],
    limits: {
      aiQueries: -1,
      documents: -1,
      storage: 500,
      cases: -1,
      support: 'dedicated',
      analytics: true,
      customIntegrations: true,
      sla: true
    }
  }
};

export const getPlanByCode = (code: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS[code];
};

export const getAllPlans = (): SubscriptionPlan[] => {
  return Object.values(SUBSCRIPTION_PLANS);
};

export const getPopularPlan = (): SubscriptionPlan => {
  return SUBSCRIPTION_PLANS.professional;
};

export const calculateSavings = (plan: SubscriptionPlan): number => {
  if (plan.priceYearly === 0) return 0;
  const monthlyTotal = plan.priceMonthly * 12;
  return monthlyTotal - plan.priceYearly;
};

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  if (price === 0) return 'Gratis';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

export const isUnlimited = (value: number): boolean => {
  return value === -1;
};

export const formatLimit = (value: number, unit: string = ''): string => {
  if (isUnlimited(value)) return 'Ilimitado';
  return `${value.toLocaleString('es-EC')}${unit ? ' ' + unit : ''}`;
};
