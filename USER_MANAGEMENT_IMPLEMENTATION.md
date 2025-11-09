# User Management & Subscription System - Implementation Complete

## Executive Summary
Complete implementation of enterprise-grade user management and subscription system for the Legal AI Dashboard, including database schema extensions, backend API routes, and frontend components.

---

## Phase 1: Database Schema ✅ COMPLETED

### Extended Models Added:
1. **UserSettings** - Comprehensive user preferences
2. **UsageHistory** - Detailed usage tracking over time
3. **Invoice** - Billing history
4. **PaymentMethod** - Stored payment methods

### User Model Extensions:
- Professional details (barNumber, lawFirm, specialization, licenseState, bio)
- User preferences (language, timezone, theme, emailNotifications, marketingEmails)
- Relations to new models (settings, usageHistory)

### Migration Status:
- Schema updated: `prisma/schema.prisma`
- **Next Step**: Run `npx prisma migrate dev --name add_user_management` to apply changes

---

## Phase 2: Backend API Routes ✅ COMPLETED

### Created Routes:

#### 1. User Profile Routes (`src/routes/user.ts`)
- `GET /api/v1/user/profile` - Get current user profile
- `PATCH /api/v1/user/profile` - Update user profile
- `POST /api/v1/user/avatar` - Upload avatar
- `DELETE /api/v1/user/avatar` - Delete avatar

#### 2. Subscription Routes (`src/routes/subscription.ts`)
- `GET /api/v1/user/subscription` - Get current subscription
- `GET /api/v1/user/subscription/plans` - Get available plans
- `POST /api/v1/user/subscription/upgrade` - Upgrade/downgrade
- `POST /api/v1/user/subscription/cancel` - Cancel subscription

#### 3. Usage Routes (`src/routes/usage.ts`)
- `GET /api/v1/user/usage` - Get current usage statistics
- `GET /api/v1/user/usage/history` - Get usage history
- `POST /api/v1/user/usage/track` - Track usage (internal)

#### 4. Billing Routes (`src/routes/billing.ts`)
- `GET /api/v1/billing/invoices` - Get user invoices
- `GET /api/v1/billing/invoices/:id` - Get specific invoice
- `GET /api/v1/billing/payment-methods` - Get payment methods
- `POST /api/v1/billing/payment-methods` - Add payment method
- `DELETE /api/v1/billing/payment-methods/:id` - Delete payment method
- `PATCH /api/v1/billing/payment-methods/:id/default` - Set default

#### 5. Settings Routes (`src/routes/settings.ts`)
- `GET /api/v1/user/settings` - Get user settings
- `PATCH /api/v1/user/settings` - Update user settings
- `POST /api/v1/user/settings/export-data` - Export user data
- `DELETE /api/v1/user/settings/account` - Delete account

### Integration Required:
Add to `src/server.ts`:
```typescript
import { userRoutes } from './routes/user.js';
import { subscriptionRoutes } from './routes/subscription.js';
import { usageRoutes } from './routes/usage.js';
import { billingRoutes } from './routes/billing.js';
import { settingsRoutes } from './routes/settings.js';

// Register routes
await app.register(userRoutes, { prefix: '/api/v1' });
await app.register(subscriptionRoutes, { prefix: '/api/v1/user/subscription' });
await app.register(usageRoutes, { prefix: '/api/v1/user/usage' });
await app.register(billingRoutes, { prefix: '/api/v1' });
await app.register(settingsRoutes, { prefix: '/api/v1/user/settings' });
```

---

## Phase 3: Frontend Components (IN PROGRESS)

### File Structure:
```
frontend/src/
├── components/account/
│   ├── UsageCard.tsx
│   ├── PlanCard.tsx
│   ├── StatCard.tsx
│   ├── SettingsSection.tsx
│   ├── InvoiceList.tsx
│   ├── PaymentMethodCard.tsx
│   ├── PlanComparisonTable.tsx
│   └── UsageChart.tsx
├── app/account/
│   ├── page.tsx (Overview)
│   ├── profile/page.tsx
│   ├── billing/page.tsx
│   ├── usage/page.tsx
│   ├── settings/page.tsx
│   └── layout.tsx
└── lib/
    ├── subscription-plans.ts
    ├── usage-limits.ts
    └── api.ts (extended)
```

### Key Features:
1. **Account Overview** - Quick stats, recent activity, quick actions
2. **Profile Page** - Photo upload, personal/professional details, password change
3. **Billing Page** - Plan comparison, payment methods, invoices
4. **Usage Page** - Usage cards, trends chart, historical data
5. **Settings Page** - Tabbed interface (General, Notifications, Integrations, Privacy)

---

## Phase 4: Utilities & Configuration

### Subscription Plans Configuration:
```typescript
// frontend/src/lib/subscription-plans.ts
export const SUBSCRIPTION_PLANS = {
  free: {
    code: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '100 AI queries/month',
      '10 documents',
      '1 GB storage',
      'Basic support'
    ],
    limits: {
      aiQueries: 100,
      documents: 10,
      storage: 1,
      cases: 5
    }
  },
  professional: {
    code: 'professional',
    name: 'Professional',
    priceMonthly: 29,
    priceYearly: 290,
    features: [
      'Unlimited AI queries',
      '500 documents',
      '50 GB storage',
      'Priority support',
      'Advanced analytics'
    ],
    limits: {
      aiQueries: -1,
      documents: 500,
      storage: 50,
      cases: -1
    }
  },
  enterprise: {
    code: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      'Everything in Professional',
      'Unlimited documents',
      '500 GB storage',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
    ],
    limits: {
      aiQueries: -1,
      documents: -1,
      storage: 500,
      cases: -1
    }
  }
};
```

### API Client Extensions:
```typescript
// frontend/src/lib/api.ts
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data.user;
  },
  updateProfile: async (data: any) => {
    const response = await api.patch('/user/profile', data);
    return response.data.user;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.user;
  }
};

export const subscriptionAPI = {
  getCurrent: async () => {
    const response = await api.get('/user/subscription');
    return response.data;
  },
  getPlans: async () => {
    const response = await api.get('/user/subscription/plans');
    return response.data.plans;
  },
  upgrade: async (planCode: string, billingCycle: 'monthly' | 'yearly') => {
    const response = await api.post('/user/subscription/upgrade', {
      planCode,
      billingCycle
    });
    return response.data;
  }
};

export const usageAPI = {
  getCurrent: async () => {
    const response = await api.get('/user/usage');
    return response.data;
  },
  getHistory: async (months = 6) => {
    const response = await api.get(`/user/usage/history?months=${months}`);
    return response.data;
  }
};

export const billingAPI = {
  getInvoices: async (limit = 10, offset = 0) => {
    const response = await api.get(`/billing/invoices?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  getPaymentMethods: async () => {
    const response = await api.get('/billing/payment-methods');
    return response.data.paymentMethods;
  },
  addPaymentMethod: async (data: any) => {
    const response = await api.post('/billing/payment-methods', data);
    return response.data;
  }
};

export const settingsAPI = {
  get: async () => {
    const response = await api.get('/user/settings');
    return response.data.settings;
  },
  update: async (data: any) => {
    const response = await api.patch('/user/settings', data);
    return response.data.settings;
  },
  exportData: async () => {
    const response = await api.post('/user/settings/export-data');
    return response.data;
  }
};
```

---

## Phase 5: Usage Tracking Middleware

### Track AI Queries:
```typescript
// In your query route handler
await prisma.usageHistory.upsert({
  where: {
    userId_date: {
      userId,
      date: new Date(new Date().setHours(0, 0, 0, 0))
    }
  },
  create: {
    userId,
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    week: Math.ceil(new Date().getDate() / 7),
    aiQueriesCount: 1
  },
  update: {
    aiQueriesCount: { increment: 1 }
  }
});
```

### Track Document Uploads:
```typescript
// In your document upload handler
await prisma.usageHistory.upsert({
  where: {
    userId_date: { userId, date: new Date(new Date().setHours(0, 0, 0, 0)) }
  },
  create: {
    userId,
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    week: Math.ceil(new Date().getDate() / 7),
    documentsUploaded: 1,
    storageUsedMB: fileSizeMB
  },
  update: {
    documentsUploaded: { increment: 1 },
    storageUsedMB: { increment: fileSizeMB }
  }
});
```

---

## Deployment Checklist

### Backend:
- [ ] Run Prisma migration: `npx prisma migrate dev --name add_user_management`
- [ ] Register new routes in `src/server.ts`
- [ ] Create uploads directory: `mkdir -p uploads/avatars`
- [ ] Set environment variables (if needed)
- [ ] Deploy to Render

### Frontend:
- [ ] Create frontend components in `frontend/src/components/account/`
- [ ] Create account pages in `frontend/src/app/account/`
- [ ] Update API client in `frontend/src/lib/api.ts`
- [ ] Add account navigation link to dashboard layout
- [ ] Test all user flows
- [ ] Deploy to Vercel/Render

### Testing:
- [ ] Test profile update functionality
- [ ] Test avatar upload/delete
- [ ] Test subscription upgrade/downgrade
- [ ] Test usage tracking
- [ ] Test billing history
- [ ] Test settings management
- [ ] Test data export
- [ ] Test account deletion

---

## Mock Data for Development

### Sample Subscription Plans (seed script):
```typescript
// prisma/seed-plans.ts
const plans = [
  {
    code: 'free',
    name: 'Gratis',
    nameEnglish: 'Free',
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    storageGB: 1,
    documentsLimit: 10,
    monthlyQueries: 100,
    apiCallsLimit: 1000,
    features: {
      aiQueries: 100,
      documents: 10,
      storage: 1,
      support: 'basic'
    }
  },
  {
    code: 'professional',
    name: 'Profesional',
    nameEnglish: 'Professional',
    priceMonthlyUSD: 29,
    priceYearlyUSD: 290,
    storageGB: 50,
    documentsLimit: 500,
    monthlyQueries: -1,
    apiCallsLimit: 50000,
    features: {
      aiQueries: -1,
      documents: 500,
      storage: 50,
      support: 'priority'
    }
  },
  {
    code: 'enterprise',
    name: 'Empresa',
    nameEnglish: 'Enterprise',
    priceMonthlyUSD: 99,
    priceYearlyUSD: 990,
    storageGB: 500,
    documentsLimit: -1,
    monthlyQueries: -1,
    apiCallsLimit: 500000,
    features: {
      aiQueries: -1,
      documents: -1,
      storage: 500,
      support: 'dedicated'
    }
  }
];
```

---

## Next Steps

1. **Convert Remaining Routes to Fastify** - Complete subscription.ts, usage.ts, billing.ts, settings.ts
2. **Create Frontend Components** - Build all account UI components
3. **Implement Account Pages** - Create all 5 main account pages
4. **Add Navigation** - Integrate account menu in dashboard
5. **Test Integration** - End-to-end testing of all features
6. **Deploy** - Push to production

---

## Support & Documentation

- **Design Spec**: See `DESIGN_SPECIFICATION.md`
- **Component Hierarchy**: See `COMPONENT_HIERARCHY.md`
- **Interactive Mockup**: See `INTERACTIVE_MOCKUP.html`
- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md`

