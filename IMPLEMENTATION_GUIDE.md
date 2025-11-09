# Implementation Guide - User Management & Subscription System

## Overview
This guide provides step-by-step instructions for implementing the User Management and Subscription System for the Legal AI Dashboard. It's designed for developers familiar with Next.js 15, TypeScript, and Tailwind CSS.

---

## Prerequisites

### Required Technologies
- Node.js 18+ or 20+
- Next.js 15 (App Router)
- TypeScript 5+
- Tailwind CSS 3+
- PostgreSQL or compatible database
- Stripe account (for payments)

### Required Packages
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.0.0",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.309.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.10.0",
    "swr": "^2.2.4",
    "@stripe/stripe-js": "^2.4.0",
    "@stripe/react-stripe-js": "^2.4.0",
    "zod": "^3.22.4",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## Phase 1: Project Setup (Day 1)

### Step 1.1: Install shadcn/ui Components

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Install required components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add label
```

### Step 1.2: Database Schema Setup

Create Prisma schema for user management:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PlanType {
  FREE
  PROFESSIONAL
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  PAUSED
}

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  emailVerified     DateTime?
  password          String
  firstName         String
  lastName          String
  avatar            String?
  phone             String?

  // Professional details
  jobTitle          String?
  lawFirm           String?
  barNumber         String?
  jurisdiction      String[]
  specializations   String[]
  yearsExperience   Int?
  website           String?
  linkedIn          String?

  // Settings
  language          String    @default("en")
  timezone          String    @default("America/New_York")
  dateFormat        String    @default("MM/DD/YYYY")
  timeFormat        String    @default("12h")

  // Security
  twoFactorEnabled  Boolean   @default(false)
  twoFactorSecret   String?
  recoveryCodes     String[]

  // Privacy
  analyticsEnabled  Boolean   @default(true)
  shareUsageData    Boolean   @default(true)
  aiTrainingOptIn   Boolean   @default(false)
  profileVisible    Boolean   @default(false)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  subscription      Subscription?
  sessions          Session[]
  apiKeys           ApiKey[]
  activities        Activity[]
  notifications     NotificationPreference[]

  @@index([email])
}

model Subscription {
  id                String             @id @default(uuid())
  userId            String             @unique
  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  plan              PlanType           @default(FREE)
  status            SubscriptionStatus @default(ACTIVE)

  // Billing
  stripeCustomerId      String?        @unique
  stripeSubscriptionId  String?        @unique
  stripePriceId         String?

  billingCycle      String             @default("monthly") // monthly, annual
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean           @default(false)
  canceledAt         DateTime?

  // Payment
  defaultPaymentMethodId String?

  // Usage tracking
  aiQueriesUsed     Int                @default(0)
  activeCases       Int                @default(0)
  storageUsed       BigInt             @default(0) // in bytes
  documentsUploaded Int                @default(0)

  // Limits reset
  lastResetAt       DateTime           @default(now())

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  invoices          Invoice[]
  usageRecords      UsageRecord[]

  @@index([userId])
  @@index([stripeCustomerId])
}

model PaymentMethod {
  id                String    @id @default(uuid())
  userId            String

  stripePaymentMethodId String @unique
  type              String    // card, bank_account
  brand             String?   // visa, mastercard, etc.
  last4             String
  expiryMonth       Int?
  expiryYear        Int?

  isDefault         Boolean   @default(false)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
}

model Invoice {
  id                String    @id @default(uuid())
  subscriptionId    String
  subscription      Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  stripeInvoiceId   String    @unique
  number            String    @unique

  amount            Decimal   @db.Decimal(10, 2)
  currency          String    @default("usd")
  tax               Decimal?  @db.Decimal(10, 2)
  total             Decimal   @db.Decimal(10, 2)

  status            String    // paid, failed, pending
  description       String?

  invoiceUrl        String?
  pdfUrl            String?

  dueDate           DateTime?
  paidAt            DateTime?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([subscriptionId])
  @@index([stripeInvoiceId])
}

model UsageRecord {
  id                String    @id @default(uuid())
  subscriptionId    String
  subscription      Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  date              DateTime  @default(now())

  aiQueries         Int       @default(0)
  casesCreated      Int       @default(0)
  documentsUploaded Int       @default(0)
  storageAdded      BigInt    @default(0)

  createdAt         DateTime  @default(now())

  @@index([subscriptionId, date])
}

model Session {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  token             String    @unique
  deviceInfo        String?
  browser           String?
  location          String?
  ipAddress         String?

  expiresAt         DateTime
  lastActiveAt      DateTime  @default(now())

  createdAt         DateTime  @default(now())

  @@index([userId])
  @@index([token])
}

model ApiKey {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  name              String
  key               String    @unique

  permissions       String[]

  lastUsedAt        DateTime?
  expiresAt         DateTime?

  createdAt         DateTime  @default(now())

  @@index([userId])
  @@index([key])
}

model Activity {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  type              String    // document_upload, ai_query, case_created, etc.
  description       String
  metadata          Json?

  createdAt         DateTime  @default(now())

  @@index([userId, createdAt])
}

model NotificationPreference {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  category          String    // account_billing, case_activity, ai_analysis, system_updates
  notificationType  String    // email, push, sms

  enabled           Boolean   @default(true)
  frequency         String    @default("instant") // instant, daily, weekly

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([userId, category, notificationType])
  @@index([userId])
}
```

Run migrations:
```bash
npx prisma migrate dev --name init_user_management
npx prisma generate
```

### Step 1.3: Environment Variables

Create `.env.local`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/legal_ai_dashboard"

# Authentication
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_PRO_ANNUAL="price_..."
STRIPE_PRICE_ENTERPRISE_MONTHLY="price_..."
STRIPE_PRICE_ENTERPRISE_ANNUAL="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (optional, for notifications)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="noreply@yourdomain.com"
```

---

## Phase 2: Core Infrastructure (Days 2-3)

### Step 2.1: Create Type Definitions

```typescript
// lib/types/account.ts

export type PlanType = 'free' | 'professional' | 'enterprise';

export interface User {
  id: string;
  email: string;
  emailVerified: Date | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  phone: string | null;

  // Professional
  jobTitle: string | null;
  lawFirm: string | null;
  barNumber: string | null;
  jurisdiction: string[];
  specializations: string[];

  // Settings
  language: string;
  timezone: string;

  // Security
  twoFactorEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  status: 'active' | 'canceled' | 'past_due' | 'paused';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;

  // Usage
  aiQueriesUsed: number;
  activeCases: number;
  storageUsed: number;
  documentsUploaded: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  aiQueries: number;
  activeCases: number;
  storage: number; // in bytes
  documentsPerMonth: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    aiQueries: 50,
    activeCases: 5,
    storage: 100 * 1024 * 1024, // 100MB
    documentsPerMonth: 25,
  },
  professional: {
    aiQueries: 500,
    activeCases: 50,
    storage: 5 * 1024 * 1024 * 1024, // 5GB
    documentsPerMonth: 500,
  },
  enterprise: {
    aiQueries: 5000,
    activeCases: 999999, // Unlimited
    storage: 50 * 1024 * 1024 * 1024, // 50GB
    documentsPerMonth: 999999, // Unlimited
  },
};

export interface Usage {
  aiQueries: number;
  activeCases: number;
  storageUsed: number;
  documentsUploaded: number;
}

export interface UsageTrend {
  date: string;
  aiQueries: number;
  cases: number;
  storage: number;
  documents: number;
}
```

### Step 2.2: Create API Utilities

```typescript
// lib/api/account.ts

import { prisma } from '@/lib/prisma';
import { User, Subscription } from '@/lib/types/account';

export async function getUserWithSubscription(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  });
}

export async function updateUserProfile(userId: string, data: Partial<User>) {
  return await prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function getUsageStats(subscriptionId: string, month?: string) {
  const startDate = month
    ? new Date(`${month}-01`)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  const records = await prisma.usageRecord.findMany({
    where: {
      subscriptionId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  return records;
}

export async function incrementUsage(
  subscriptionId: string,
  type: 'aiQueries' | 'documents' | 'storage',
  amount: number = 1
) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const updateData: any = {};

  if (type === 'aiQueries') {
    updateData.aiQueriesUsed = subscription.aiQueriesUsed + amount;
  } else if (type === 'documents') {
    updateData.documentsUploaded = subscription.documentsUploaded + amount;
  } else if (type === 'storage') {
    updateData.storageUsed = subscription.storageUsed + BigInt(amount);
  }

  return await prisma.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
  });
}
```

### Step 2.3: Create Custom Hooks

```typescript
// lib/hooks/useUser.ts

import useSWR from 'swr';
import { User } from '@/lib/types/account';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useUser() {
  const { data, error, mutate } = useSWR<User>('/api/user', fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

```typescript
// lib/hooks/useSubscription.ts

import useSWR from 'swr';
import { Subscription } from '@/lib/types/account';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSubscription() {
  const { data, error, mutate } = useSWR<Subscription>('/api/subscription', fetcher);

  return {
    subscription: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

---

## Phase 3: API Routes (Days 4-5)

### Step 3.1: User Profile API

```typescript
// app/api/user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        jobTitle: true,
        lawFirm: true,
        barNumber: true,
        jurisdiction: true,
        specializations: true,
        language: true,
        timezone: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and sanitize input
    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'jobTitle',
      'lawFirm',
      'barNumber',
      'jurisdiction',
      'specializations',
      'language',
      'timezone',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 3.2: Subscription API

```typescript
// app/api/subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PLAN_LIMITS } from '@/lib/types/account';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      // Create default free subscription
      const newSubscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });

      return NextResponse.json(newSubscription);
    }

    // Include limits
    const limits = PLAN_LIMITS[subscription.plan.toLowerCase() as keyof typeof PLAN_LIMITS];

    return NextResponse.json({
      ...subscription,
      limits,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 3.3: Usage API

```typescript
// app/api/usage/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getUsageStats } from '@/lib/api/account';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const usageRecords = await getUsageStats(subscription.id, month || undefined);

    return NextResponse.json({
      current: {
        aiQueries: subscription.aiQueriesUsed,
        activeCases: subscription.activeCases,
        storageUsed: subscription.storageUsed.toString(),
        documentsUploaded: subscription.documentsUploaded,
      },
      history: usageRecords,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 3.4: Stripe Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find subscription by Stripe customer ID
  const existingSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!existingSubscription) {
    console.error('Subscription not found for customer:', customerId);
    return;
  }

  // Determine plan from price ID
  let plan: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' = 'FREE';
  const priceId = subscription.items.data[0].price.id;

  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PRO_ANNUAL
  ) {
    plan = 'PROFESSIONAL';
  } else if (
    priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL
  ) {
    plan = 'ENTERPRISE';
  }

  await prisma.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      plan,
      status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Record invoice in database
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (!subscription) return;

  await prisma.invoice.create({
    data: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      number: invoice.number || `INV-${Date.now()}`,
      amount: invoice.amount_due / 100,
      total: invoice.total / 100,
      tax: invoice.tax ? invoice.tax / 100 : 0,
      status: 'paid',
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      invoiceUrl: invoice.hosted_invoice_url || undefined,
      pdfUrl: invoice.invoice_pdf || undefined,
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' },
  });

  // TODO: Send email notification to user
}
```

---

## Phase 4: UI Components (Days 6-8)

### Step 4.1: Create Account Layout

```typescript
// app/account/layout.tsx

import { AccountSidebar } from '@/components/layout/AccountSidebar';
import { AccountHeader } from '@/components/layout/AccountHeader';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AccountHeader />
      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <AccountSidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
```

### Step 4.2: Create Core Components

```typescript
// components/account/UsageCard.tsx

import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/account/ProgressBar';

interface UsageCardProps {
  title: string;
  icon: LucideIcon;
  current: number;
  max: number;
  unit: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export function UsageCard({
  title,
  icon: Icon,
  current,
  max,
  unit,
  trend,
}: UsageCardProps) {
  const percentage = (current / max) * 100;
  const status = percentage >= 90 ? 'critical' : percentage >= 75 ? 'warning' : 'normal';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{current.toLocaleString()}</span>
            <span className="text-gray-600">
              / {max.toLocaleString()} {unit}
            </span>
          </div>
          <ProgressBar current={current} max={max} status={status} animated />
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trend.direction === 'up' ? '+' : ''}{trend.value}%
              </span>
              <span className="text-gray-600">vs last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 5: Pages Implementation (Days 9-12)

### Step 5.1: Account Overview Page

```typescript
// app/account/page.tsx

import { Suspense } from 'react';
import { AccountOverview } from './components/AccountOverview';
import { AccountOverviewSkeleton } from './components/AccountOverviewSkeleton';

export default function AccountPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<AccountOverviewSkeleton />}>
        <AccountOverview />
      </Suspense>
    </div>
  );
}
```

```typescript
// app/account/components/AccountOverview.tsx

'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUsage } from '@/lib/hooks/useUsage';
import { UsageCard } from '@/components/account/UsageCard';
import { Brain, Folder, Database, Upload } from 'lucide-react';

export function AccountOverview() {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const { usage } = useUsage();

  if (!user || !subscription || !usage) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm border p-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {user.firstName}!
        </h1>
        {/* ... more content */}
      </div>

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UsageCard
          title="AI Queries"
          icon={Brain}
          current={usage.current.aiQueries}
          max={subscription.limits.aiQueries}
          unit="queries"
        />
        {/* ... more usage cards */}
      </div>
    </div>
  );
}
```

### Step 5.2: Implement Remaining Pages

Follow similar patterns for:
- `/account/profile` - Profile management
- `/account/billing` - Billing and subscription
- `/account/usage` - Usage dashboard
- `/account/settings` - Settings pages

---

## Phase 6: Testing & Polish (Days 13-14)

### Step 6.1: Unit Tests

```typescript
// __tests__/components/UsageCard.test.tsx

import { render, screen } from '@testing-library/react';
import { UsageCard } from '@/components/account/UsageCard';
import { Brain } from 'lucide-react';

describe('UsageCard', () => {
  it('renders usage information correctly', () => {
    render(
      <UsageCard
        title="AI Queries"
        icon={Brain}
        current={350}
        max={500}
        unit="queries"
      />
    );

    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('/ 500 queries')).toBeInTheDocument();
  });

  it('shows warning status when approaching limit', () => {
    const { container } = render(
      <UsageCard
        title="AI Queries"
        icon={Brain}
        current={450}
        max={500}
        unit="queries"
      />
    );

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-amber-500');
  });
});
```

### Step 6.2: Integration Tests

```typescript
// __tests__/api/subscription.test.ts

import { GET } from '@/app/api/subscription/route';
import { NextRequest } from 'next/server';

describe('/api/subscription', () => {
  it('returns subscription for authenticated user', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscription');

    // Mock authentication
    jest.mock('@/lib/auth', () => ({
      getCurrentUser: jest.fn().mockResolvedValue({ id: 'user-123' }),
    }));

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('plan');
    expect(data).toHaveProperty('limits');
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run all tests: `npm run test`
- [ ] Build production bundle: `npm run build`
- [ ] Check TypeScript errors: `npm run type-check`
- [ ] Lint code: `npm run lint`
- [ ] Update environment variables in production
- [ ] Configure Stripe webhooks in production
- [ ] Set up database backups
- [ ] Configure monitoring and error tracking

### Stripe Configuration

1. Create products and prices in Stripe Dashboard
2. Update environment variables with production price IDs
3. Configure webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen: `customer.subscription.*`, `invoice.*`
4. Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Database Migration

```bash
# Production migration
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

---

## Performance Optimization

### 1. Implement Caching

```typescript
// lib/cache.ts

import { unstable_cache } from 'next/cache';

export const getCachedUser = unstable_cache(
  async (userId: string) => {
    return await getUserWithSubscription(userId);
  },
  ['user'],
  {
    revalidate: 300, // 5 minutes
    tags: ['user'],
  }
);
```

### 2. Optimize Database Queries

```typescript
// Use select to fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    // Only include fields you need
  },
});

// Use include for relations
const userWithSubscription = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    subscription: {
      select: {
        plan: true,
        status: true,
        // Only include needed subscription fields
      },
    },
  },
});
```

### 3. Implement Rate Limiting

```typescript
// lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Use in API routes
export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Process request...
}
```

---

## Monitoring & Analytics

### 1. Error Tracking (Sentry)

```typescript
// lib/sentry.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Analytics (PostHog)

```typescript
// lib/analytics.ts

import posthog from 'posthog-js';

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://app.posthog.com',
    });
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}
```

---

## Security Best Practices

### 1. Authentication Middleware

```typescript
// middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = await verifyJWT(token);

    // Add user to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/account/:path*', '/api/user/:path*', '/api/subscription/:path*'],
};
```

### 2. Input Validation

```typescript
// lib/validation.ts

import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  jobTitle: z.string().max(100).optional(),
  // ... more fields
});

// Use in API route
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  try {
    const validated = updateProfileSchema.parse(body);
    // Process validated data
  } catch (error) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

---

## Troubleshooting Guide

### Common Issues

**Issue: Stripe webhook not working**
- Verify webhook secret is correct
- Check webhook endpoint is publicly accessible
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Issue: Session expiring too quickly**
- Check JWT_EXPIRES_IN in environment variables
- Verify cookie settings allow persistent sessions
- Implement token refresh mechanism

**Issue: Usage limits not updating**
- Check incrementUsage is called after operations
- Verify subscription reset logic runs monthly
- Check database triggers and scheduled jobs

---

## Next Steps

After completing this implementation:

1. **User Testing**: Conduct thorough user testing
2. **Performance Audit**: Use Lighthouse and Web Vitals
3. **Security Audit**: Review authentication and authorization
4. **Documentation**: Create user-facing help documentation
5. **Training**: Train support team on new features

---

## Support & Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**End of Implementation Guide**
