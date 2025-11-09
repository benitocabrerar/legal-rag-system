# Component Hierarchy & Structure

## Overview
This document defines the complete component hierarchy for the User Management & Subscription System. It follows atomic design principles and Next.js 15 App Router conventions.

---

## Directory Structure

```
src/
├── app/
│   └── account/
│       ├── layout.tsx                  # Account section layout
│       ├── page.tsx                    # Account overview dashboard
│       ├── profile/
│       │   ├── page.tsx                # Profile management page
│       │   └── components/             # Profile-specific components
│       ├── billing/
│       │   ├── page.tsx                # Billing & subscription page
│       │   └── components/             # Billing-specific components
│       ├── usage/
│       │   ├── page.tsx                # Usage dashboard page
│       │   └── components/             # Usage-specific components
│       └── settings/
│           ├── page.tsx                # Settings page (tabbed)
│           └── components/             # Settings-specific components
│
├── components/
│   ├── ui/                             # Base UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── tabs.tsx
│   │   ├── switch.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── toast.tsx
│   │   ├── alert.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   ├── table.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   │
│   ├── account/                        # Account-specific components
│   │   ├── UserAvatar.tsx
│   │   ├── PlanBadge.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── UsageCard.tsx
│   │   ├── SettingRow.tsx
│   │   ├── PricingCard.tsx
│   │   ├── BillingCycleToggle.tsx
│   │   ├── PaymentMethodCard.tsx
│   │   ├── InvoiceRow.tsx
│   │   ├── UsageChart.tsx
│   │   ├── NotificationPreferenceGroup.tsx
│   │   ├── IntegrationCard.tsx
│   │   ├── APIKeyRow.tsx
│   │   └── DangerZoneCard.tsx
│   │
│   └── layout/                         # Layout components
│       ├── AccountNav.tsx
│       ├── AccountHeader.tsx
│       └── AccountSidebar.tsx
│
├── lib/
│   ├── types/
│   │   ├── account.ts                  # Account-related types
│   │   ├── subscription.ts             # Subscription types
│   │   └── usage.ts                    # Usage types
│   │
│   ├── api/
│   │   ├── account.ts                  # Account API functions
│   │   ├── billing.ts                  # Billing API functions
│   │   └── usage.ts                    # Usage API functions
│   │
│   ├── hooks/
│   │   ├── useUser.ts
│   │   ├── useSubscription.ts
│   │   ├── useUsage.ts
│   │   └── useSettings.ts
│   │
│   └── utils/
│       ├── format.ts                   # Formatting utilities
│       ├── validation.ts               # Form validation
│       └── constants.ts                # Constants (plans, limits, etc.)
│
└── styles/
    └── globals.css                     # Global styles and CSS variables
```

---

## Page-Level Component Breakdown

### 1. Account Overview Dashboard (`/account`)

```
AccountOverviewPage
├── AccountHeader
│   ├── UserAvatar
│   ├── PlanBadge
│   └── QuickActionButton
│
├── UsageSummarySection
│   ├── UsageCard (AI Queries)
│   ├── UsageCard (Active Cases)
│   ├── UsageCard (Storage)
│   └── UsageCard (Documents)
│
├── SubscriptionStatusCard
│   ├── PlanBadge
│   ├── NextBillingInfo
│   └── ManagePlanButton
│
├── RecentActivityTimeline
│   └── ActivityItem[]
│
└── QuickActionsPanel
    └── ActionButton[]
```

**Component Details:**

#### `AccountHeader`
```typescript
// components/account/AccountHeader.tsx
interface AccountHeaderProps {
  user: User;
  subscription: Subscription;
  onUpgrade?: () => void;
}

export function AccountHeader({ user, subscription, onUpgrade }: AccountHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <UserAvatar
          src={user.avatar}
          alt={user.name}
          size="lg"
        />
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user.firstName}!
          </h1>
          <PlanBadge plan={subscription.plan} />
        </div>
      </div>
      {subscription.plan === 'free' && (
        <Button onClick={onUpgrade} size="lg">
          Upgrade Now
        </Button>
      )}
    </div>
  );
}
```

#### `UsageSummarySection`
```typescript
// app/account/components/UsageSummarySection.tsx
interface UsageSummaryProps {
  usage: Usage;
  limits: Limits;
}

export function UsageSummarySection({ usage, limits }: UsageSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <UsageCard
        title="AI Queries"
        icon={Brain}
        current={usage.aiQueries}
        max={limits.aiQueries}
        unit="queries"
        trend={{ value: 12, direction: 'up' }}
      />
      {/* Other usage cards */}
    </div>
  );
}
```

#### `RecentActivityTimeline`
```typescript
// app/account/components/RecentActivityTimeline.tsx
interface Activity {
  id: string;
  type: 'document_upload' | 'ai_query' | 'case_created';
  description: string;
  timestamp: Date;
  icon: LucideIcon;
}

export function RecentActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} {...activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 2. Profile Management Page (`/account/profile`)

```
ProfilePage
├── ProfileSidebar
│   └── NavigationLinks[]
│
└── ProfileContent (Dynamic based on section)
    │
    ├── PersonalInformationSection
    │   ├── ProfilePhotoUpload
    │   │   ├── UserAvatar
    │   │   └── UploadButton
    │   │
    │   ├── BasicInfoForm
    │   │   ├── Input (First Name)
    │   │   ├── Input (Last Name)
    │   │   ├── Input (Email) + VerificationBadge
    │   │   ├── PhoneInput
    │   │   ├── Select (Timezone)
    │   │   └── Select (Language)
    │   │
    │   └── AutoSaveIndicator
    │
    ├── ProfessionalDetailsSection
    │   ├── Input (Job Title)
    │   ├── Input (Law Firm)
    │   ├── Input (Bar Number)
    │   ├── MultiSelect (Jurisdiction)
    │   ├── TagInput (Specializations)
    │   └── ProfileVisibilityToggle
    │
    ├── SecurityPrivacySection
    │   ├── PasswordChangeForm
    │   │   ├── Input (Current Password)
    │   │   ├── Input (New Password)
    │   │   │   └── PasswordStrengthMeter
    │   │   ├── Input (Confirm Password)
    │   │   └── PasswordRequirementsList
    │   │
    │   ├── TwoFactorAuthCard
    │   │   ├── StatusBadge
    │   │   ├── EnableTwoFactorModal
    │   │   │   ├── QRCodeDisplay
    │   │   │   ├── ManualEntryCode
    │   │   │   ├── VerificationCodeInput
    │   │   │   └── RecoveryCodesDownload
    │   │   └── DisableTwoFactorButton
    │   │
    │   ├── PrivacyControlsCard
    │   │   └── SettingRow[]
    │   │
    │   └── DataManagementCard
    │       ├── ExportDataButton
    │       └── DeleteAccountButton
    │
    └── SessionManagementSection
        ├── ActiveSessionsTable
        │   └── SessionRow[]
        │       ├── DeviceInfo
        │       ├── LocationInfo
        │       ├── LastActiveTime
        │       └── RevokeButton
        │
        ├── SignOutAllButton
        └── SessionHistoryToggle
            └── SessionHistoryTable
```

**Component Details:**

#### `ProfilePhotoUpload`
```typescript
// app/account/profile/components/ProfilePhotoUpload.tsx
interface ProfilePhotoUploadProps {
  currentPhoto?: string;
  userName: string;
  onUpload: (file: File) => Promise<void>;
}

export function ProfilePhotoUpload({
  currentPhoto,
  userName,
  onUpload
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await onUpload(file);
    setIsUploading(false);
  };

  return (
    <div className="relative inline-block">
      <UserAvatar
        src={currentPhoto}
        alt={userName}
        size="xl"
      />
      <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
        <Upload className="w-6 h-6 text-white" />
        <input
          type="file"
          className="hidden"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
```

#### `PasswordStrengthMeter`
```typescript
// components/account/PasswordStrengthMeter.tsx
interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password);

  const getStrengthColor = () => {
    if (strength < 25) return 'bg-red-500';
    if (strength < 50) return 'bg-orange-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-2">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getStrengthColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <p className="text-sm text-gray-600">
        Password strength: {getStrengthLabel(strength)}
      </p>
    </div>
  );
}
```

#### `ActiveSessionsTable`
```typescript
// app/account/profile/components/ActiveSessionsTable.tsx
interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: Date;
  isCurrent: boolean;
}

export function ActiveSessionsTable({
  sessions,
  onRevoke
}: {
  sessions: Session[];
  onRevoke: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device/Browser</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Last Active</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            onRevoke={onRevoke}
          />
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### 3. Billing & Subscription Page (`/account/billing`)

```
BillingPage
├── CurrentPlanSection
│   ├── PlanCard
│   │   ├── PlanBadge
│   │   ├── PlanDetails
│   │   ├── NextBillingInfo
│   │   └── ManagePlanDropdown
│   │
│   └── PlanFeaturesChecklist
│
├── PlanComparisonSection
│   ├── BillingCycleToggle
│   └── PricingComparisonTable
│       ├── PricingCard (Free)
│       ├── PricingCard (Professional) [Highlighted]
│       └── PricingCard (Enterprise)
│
├── PaymentMethodsSection
│   ├── PrimaryPaymentCard
│   │   ├── PaymentMethodCard
│   │   └── EditPaymentButton
│   │
│   ├── AddPaymentMethodButton
│   │   └── AddPaymentModal
│   │       ├── StripeCardElement
│   │       ├── BillingAddressForm
│   │       └── SetDefaultToggle
│   │
│   └── SavedPaymentMethodsList
│
├── BillingHistorySection
│   ├── InvoiceFilters
│   │   ├── DateRangePicker
│   │   ├── StatusFilter
│   │   └── ExportButton
│   │
│   ├── InvoiceTable
│   │   └── InvoiceRow[]
│   │       ├── InvoiceNumber
│   │       ├── DateDisplay
│   │       ├── AmountDisplay
│   │       ├── StatusBadge
│   │       └── ActionButtons
│   │
│   └── InvoiceDetailsModal
│
└── UsageLimitsSection
    ├── MonthSelector
    └── UsageOverviewCards
        ├── UsageCard (AI Queries)
        ├── UsageCard (Cases)
        ├── UsageCard (Storage)
        └── UsageCard (Documents)
```

**Component Details:**

#### `PlanCard`
```typescript
// app/account/billing/components/PlanCard.tsx
interface PlanCardProps {
  subscription: Subscription;
  onManage: () => void;
}

export function PlanCard({ subscription, onManage }: PlanCardProps) {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <PlanBadge plan={subscription.plan} size="lg" showIcon />
            <h2 className="text-3xl font-bold">
              {getPlanName(subscription.plan)}
            </h2>
            <p className="text-2xl">
              {subscription.plan === 'free'
                ? 'Free Forever'
                : `$${subscription.price}/month`}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Manage Plan <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Change Billing Cycle</DropdownMenuItem>
              <DropdownMenuItem>Update Payment Method</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Cancel Subscription
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {subscription.plan !== 'free' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Next billing date</span>
              <span className="font-medium">
                {format(subscription.nextBillingDate, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment method</span>
              <span className="font-medium">
                {subscription.paymentMethod.brand} ••••{subscription.paymentMethod.last4}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### `PricingComparisonTable`
```typescript
// app/account/billing/components/PricingComparisonTable.tsx
interface PricingComparisonTableProps {
  currentPlan: PlanType;
  billingCycle: 'monthly' | 'annual';
  onUpgrade: (plan: PlanType) => void;
}

const PLAN_FEATURES = {
  free: {
    cases: 5,
    aiQueries: 50,
    storage: '100MB',
    support: 'Email',
    // ... more features
  },
  professional: {
    cases: 50,
    aiQueries: 500,
    storage: '5GB',
    support: 'Priority',
    // ... more features
  },
  enterprise: {
    cases: 'Unlimited',
    aiQueries: 5000,
    storage: '50GB',
    support: 'Dedicated',
    // ... more features
  }
};

export function PricingComparisonTable({
  currentPlan,
  billingCycle,
  onUpgrade
}: PricingComparisonTableProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(PLAN_FEATURES).map(([plan, features]) => (
        <PricingCard
          key={plan}
          plan={plan as PlanType}
          features={features}
          billingCycle={billingCycle}
          highlighted={plan === currentPlan}
          onSelect={() => onUpgrade(plan as PlanType)}
        />
      ))}
    </div>
  );
}
```

#### `InvoiceRow`
```typescript
// components/account/InvoiceRow.tsx
interface InvoiceRowProps {
  invoice: Invoice;
  onDownload: () => void;
  onView: () => void;
}

export function InvoiceRow({ invoice, onDownload, onView }: InvoiceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="font-mono">
          {invoice.number}
        </TableCell>
        <TableCell>
          {format(invoice.date, 'MMM d, yyyy')}
        </TableCell>
        <TableCell>{invoice.description}</TableCell>
        <TableCell className="font-semibold">
          ${invoice.amount.toFixed(2)}
        </TableCell>
        <TableCell>
          <Badge variant={invoice.status === 'paid' ? 'success' : 'destructive'}>
            {invoice.status}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6}>
            <InvoiceDetails invoice={invoice} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

---

### 4. Usage Dashboard Page (`/account/usage`)

```
UsagePage
├── UsageHeader
│   ├── MonthSelector
│   └── ExportUsageButton
│
├── UsageOverviewCards
│   ├── UsageCard (AI Queries)
│   ├── UsageCard (Active Cases)
│   ├── UsageCard (Storage)
│   └── UsageCard (Documents)
│
├── UsageTrendsSection
│   ├── MetricToggleButtons
│   └── UsageChart
│       └── ResponsiveChart (Line/Bar)
│
├── DetailedBreakdownSection
│   ├── UsageBreakdownTable
│   │   └── UsageBreakdownRow[]
│   │
│   └── CategoryBreakdown
│       └── PieChart
│
└── UsageAlertsSection
    ├── ActiveAlerts[]
    │   └── AlertCard
    │
    └── AlertSettingsCard
        ├── ThresholdSlider (50%, 75%, 90%)
        └── EmailNotificationToggle
```

**Component Details:**

#### `UsageCard`
```typescript
// components/account/UsageCard.tsx
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
  status?: 'normal' | 'warning' | 'critical';
}

export function UsageCard({
  title,
  icon: Icon,
  current,
  max,
  unit,
  trend,
  status = 'normal'
}: UsageCardProps) {
  const percentage = (current / max) * 100;

  const getStatusColor = () => {
    if (status === 'critical') return 'text-red-600';
    if (status === 'warning') return 'text-amber-600';
    return 'text-blue-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${getStatusColor()}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {current.toLocaleString()}
            </span>
            <span className="text-gray-600">
              / {max.toLocaleString()} {unit}
            </span>
          </div>

          <ProgressBar
            current={current}
            max={max}
            status={status}
            animated
          />

          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trend.value}%
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

#### `UsageChart`
```typescript
// components/account/UsageChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UsageChartProps {
  data: ChartDataPoint[];
  metrics: string[];
  timeRange: 'week' | 'month' | 'quarter' | 'year';
}

export function UsageChart({ data, metrics, timeRange }: UsageChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<string[]>(metrics);

  const metricConfig = {
    aiQueries: { color: '#3b82f6', label: 'AI Queries' },
    cases: { color: '#10b981', label: 'Cases' },
    storage: { color: '#f59e0b', label: 'Storage' },
    documents: { color: '#8b5cf6', label: 'Documents' }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Usage Over Time</CardTitle>
          <div className="flex gap-2">
            {Object.entries(metricConfig).map(([key, config]) => (
              <Button
                key={key}
                size="sm"
                variant={activeMetrics.includes(key) ? 'default' : 'outline'}
                onClick={() => {
                  setActiveMetrics(prev =>
                    prev.includes(key)
                      ? prev.filter(m => m !== key)
                      : [...prev, key]
                  );
                }}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM d')}
            />
            <YAxis />
            <Tooltip />
            {activeMetrics.map(metric => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={metricConfig[metric].color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### 5. Settings Page (`/account/settings`)

```
SettingsPage
├── SettingsTabs
│   ├── Tab (General)
│   ├── Tab (Notifications)
│   ├── Tab (Integrations)
│   ├── Tab (Advanced)
│   └── Tab (Privacy)
│
└── TabContent (Dynamic)
    │
    ├── GeneralSettingsTab
    │   ├── PreferencesSection
    │   │   ├── SettingRow (Language)
    │   │   ├── SettingRow (Timezone)
    │   │   ├── SettingRow (Date Format)
    │   │   └── SettingRow (Time Format)
    │   │
    │   ├── DashboardDefaultsSection
    │   │   ├── SettingRow (Default Legal Type)
    │   │   ├── SettingRow (Default View)
    │   │   └── SettingRow (Items Per Page)
    │   │
    │   └── AccessibilitySection
    │       ├── SettingRow (Reduce Motion)
    │       ├── SettingRow (High Contrast)
    │       └── SettingRow (Keyboard Hints)
    │
    ├── NotificationsTab
    │   ├── EmailNotificationsSection
    │   │   ├── NotificationPreferenceGroup (Account & Billing)
    │   │   ├── NotificationPreferenceGroup (Case Activity)
    │   │   ├── NotificationPreferenceGroup (AI & Analysis)
    │   │   └── NotificationPreferenceGroup (System Updates)
    │   │
    │   ├── FrequencySelector
    │   └── TestNotificationButton
    │
    ├── IntegrationsTab
    │   ├── ConnectedAppsGrid
    │   │   ├── IntegrationCard (Slack)
    │   │   ├── IntegrationCard (Microsoft 365)
    │   │   ├── IntegrationCard (Google Workspace)
    │   │   └── IntegrationCard[]
    │   │
    │   └── APIAccessSection
    │       ├── APIKeysTable
    │       │   └── APIKeyRow[]
    │       │
    │       ├── CreateAPIKeyButton
    │       │   └── CreateAPIKeyModal
    │       │
    │       └── RateLimitsDisplay
    │
    ├── AdvancedTab
    │   ├── DataExportSection
    │   │   ├── ExportOptionsForm
    │   │   └── ExportHistoryTable
    │   │
    │   ├── DataImportSection
    │   │   └── FileUploadArea
    │   │
    │   └── DangerZoneSection
    │       ├── DangerZoneCard (Reset Settings)
    │       ├── DangerZoneCard (Clear Data)
    │       └── DangerZoneCard (Delete Account)
    │
    └── PrivacyTab
        ├── PrivacyControlsSection
        │   └── SettingRow[]
        │
        ├── DataRetentionSection
        │   └── RetentionPolicySelector
        │
        ├── CookiePreferencesSection
        │   ├── CookieCategoryToggle (Analytics)
        │   ├── CookieCategoryToggle (Marketing)
        │   └── CookieCategoryToggle (Preferences)
        │
        └── DataProcessingSection
            ├── ComplianceBadges
            └── PolicyLinks
```

**Component Details:**

#### `SettingRow`
```typescript
// components/account/SettingRow.tsx
interface SettingRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  helpText?: string;
  badge?: string;
}

export function SettingRow({
  label,
  description,
  control,
  helpText,
  badge
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">
            {label}
          </Label>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {helpText && (
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{helpText}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <div className="min-w-[200px]">
          {control}
        </div>
      </div>
    </div>
  );
}
```

#### `NotificationPreferenceGroup`
```typescript
// components/account/NotificationPreferenceGroup.tsx
interface NotificationOption {
  id: string;
  label: string;
  description: string;
}

interface NotificationPreferenceGroupProps {
  category: string;
  notifications: NotificationOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function NotificationPreferenceGroup({
  category,
  notifications,
  value,
  onChange
}: NotificationPreferenceGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const allSelected = notifications.every(n => value.includes(n.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onChange(value.filter(id => !notifications.map(n => n.id).includes(id)));
    } else {
      onChange([...value, ...notifications.map(n => n.id)]);
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{category}</CardTitle>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <Label htmlFor={notification.id} className="font-medium">
                    {notification.label}
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.description}
                  </p>
                </div>
                <Switch
                  id={notification.id}
                  checked={value.includes(notification.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...value, notification.id]);
                    } else {
                      onChange(value.filter(id => id !== notification.id));
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

#### `IntegrationCard`
```typescript
// components/account/IntegrationCard.tsx
interface IntegrationCardProps {
  integration: {
    id: string;
    name: string;
    icon: string;
    description: string;
    connected: boolean;
    lastSynced?: Date;
  };
  onConnect: () => void;
  onConfigure: () => void;
  onDisconnect: () => void;
}

export function IntegrationCard({
  integration,
  onConnect,
  onConfigure,
  onDisconnect
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src={integration.icon}
              alt={integration.name}
              className="w-12 h-12 rounded-lg"
            />
            <div>
              <CardTitle className="text-lg">
                {integration.name}
              </CardTitle>
              <Badge
                variant={integration.connected ? 'success' : 'secondary'}
                className="mt-1"
              >
                {integration.connected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {integration.description}
        </p>
        {integration.connected ? (
          <div className="space-y-2">
            {integration.lastSynced && (
              <p className="text-xs text-gray-500">
                Last synced: {formatDistanceToNow(integration.lastSynced)} ago
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={onConfigure} variant="outline" size="sm">
                Configure
              </Button>
              <Button
                onClick={onDisconnect}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onConnect} size="sm">
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Shared Component Library

### Base Components (from shadcn/ui)

All base components should be implemented using shadcn/ui with Tailwind CSS styling.

**Installation:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card badge progress tabs switch select dialog dropdown-menu toast alert avatar separator table tooltip
```

### Custom Shared Components

#### `ProgressBar`
```typescript
// components/account/ProgressBar.tsx
interface ProgressBarProps {
  current: number;
  max: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  status?: 'normal' | 'warning' | 'critical';
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  current,
  max,
  showPercentage = false,
  showLabel = false,
  status = 'normal',
  animated = false,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min((current / max) * 100, 100);

  const getStatusColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <span className="text-sm text-gray-600">
            {current.toLocaleString()} / {max.toLocaleString()}
          </span>
        )}
        {showPercentage && (
          <span className="text-sm font-medium">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${animated ? 'transition-all duration-500' : ''}`}
        indicatorClassName={getStatusColor()}
      />
    </div>
  );
}
```

#### `PlanBadge`
```typescript
// components/account/PlanBadge.tsx
import { Crown, Star } from 'lucide-react';

interface PlanBadgeProps {
  plan: 'free' | 'professional' | 'enterprise';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PlanBadge({ plan, size = 'md', showIcon = false }: PlanBadgeProps) {
  const config = {
    free: {
      label: 'Free',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: null
    },
    professional: {
      label: 'Professional',
      className: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: Crown
    },
    enterprise: {
      label: 'Enterprise',
      className: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: Star
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const planConfig = config[plan];
  const Icon = planConfig.icon;

  return (
    <Badge
      variant="outline"
      className={`${planConfig.className} ${sizeClasses[size]} font-medium border`}
    >
      {showIcon && Icon && (
        <Icon className={`${iconSizes[size]} mr-1`} />
      )}
      {planConfig.label}
    </Badge>
  );
}
```

#### `UserAvatar`
```typescript
// components/account/UserAvatar.tsx
interface UserAvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  status?: 'online' | 'offline' | 'busy';
  editable?: boolean;
  onEdit?: () => void;
}

export function UserAvatar({
  src,
  alt,
  size = 'md',
  fallback,
  status,
  editable = false,
  onEdit
}: UserAvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback className="bg-blue-500 text-white">
          {fallback || getInitials(alt)}
        </AvatarFallback>
      </Avatar>

      {status && (
        <span
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-white ${statusColors[status]}`}
        />
      )}

      {editable && (
        <button
          onClick={onEdit}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full"
        >
          <Camera className="h-4 w-4 text-white" />
        </button>
      )}
    </div>
  );
}
```

---

## API Integration Patterns

### Custom Hooks

#### `useUser`
```typescript
// lib/hooks/useUser.ts
import useSWR from 'swr';

export function useUser() {
  const { data, error, mutate } = useSWR('/api/user', fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    updateUser: async (updates: Partial<User>) => {
      const updated = await updateUser(updates);
      mutate(updated, false);
      return updated;
    }
  };
}
```

#### `useSubscription`
```typescript
// lib/hooks/useSubscription.ts
import useSWR from 'swr';

export function useSubscription() {
  const { data, error, mutate } = useSWR('/api/subscription', fetcher);

  return {
    subscription: data,
    isLoading: !error && !data,
    isError: error,
    upgrade: async (plan: PlanType) => {
      const updated = await upgradePlan(plan);
      mutate(updated, false);
      return updated;
    },
    cancel: async () => {
      const updated = await cancelSubscription();
      mutate(updated, false);
      return updated;
    }
  };
}
```

#### `useUsage`
```typescript
// lib/hooks/useUsage.ts
import useSWR from 'swr';

export function useUsage(month?: string) {
  const endpoint = month ? `/api/usage?month=${month}` : '/api/usage';
  const { data, error } = useSWR(endpoint, fetcher, {
    refreshInterval: 60000 // Refresh every minute
  });

  return {
    usage: data,
    isLoading: !error && !data,
    isError: error
  };
}
```

---

## State Management

### Context Providers

#### `AccountProvider`
```typescript
// contexts/AccountContext.tsx
interface AccountContextType {
  user: User | null;
  subscription: Subscription | null;
  usage: Usage | null;
  updateProfile: (data: Partial<User>) => Promise<void>;
  upgradeSubscription: (plan: PlanType) => Promise<void>;
}

export const AccountContext = createContext<AccountContextType | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useUser();
  const { subscription, upgrade } = useSubscription();
  const { usage } = useUsage();

  const value = {
    user,
    subscription,
    usage,
    updateProfile: updateUser,
    upgradeSubscription: upgrade
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
}
```

---

## Routing Structure

### App Router Pages

```
app/
└── account/
    ├── layout.tsx                      # Account wrapper with navigation
    ├── page.tsx                        # /account (overview)
    ├── profile/
    │   └── page.tsx                    # /account/profile
    ├── billing/
    │   └── page.tsx                    # /account/billing
    ├── usage/
    │   └── page.tsx                    # /account/usage
    └── settings/
        └── page.tsx                    # /account/settings
```

#### `app/account/layout.tsx`
```typescript
// app/account/layout.tsx
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AccountProvider>
      <div className="min-h-screen bg-gray-50">
        <AccountHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            <AccountSidebar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AccountProvider>
  );
}
```

---

## Testing Strategy

### Component Testing

```typescript
// Example: UsageCard.test.tsx
import { render, screen } from '@testing-library/react';
import { UsageCard } from '@/components/account/UsageCard';

describe('UsageCard', () => {
  it('renders current and max values', () => {
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
    render(
      <UsageCard
        title="AI Queries"
        icon={Brain}
        current={450}
        max={500}
        unit="queries"
        status="warning"
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-amber-500');
  });
});
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const UsageChart = dynamic(() => import('@/components/account/UsageChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Chart doesn't need SSR
});

const InvoiceDetailsModal = dynamic(
  () => import('@/app/account/billing/components/InvoiceDetailsModal'),
  { loading: () => <ModalSkeleton /> }
);
```

### Data Prefetching

```typescript
// app/account/page.tsx
export default async function AccountPage() {
  // Prefetch critical data
  const [user, subscription, usage] = await Promise.all([
    getUser(),
    getSubscription(),
    getUsage()
  ]);

  return (
    <AccountOverview
      user={user}
      subscription={subscription}
      usage={usage}
    />
  );
}
```

---

## Accessibility Implementation

### Keyboard Navigation

```typescript
// Example: Modal with focus trap
import { useEffect, useRef } from 'react';

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        // Focus trap logic...
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent ref={modalRef} aria-labelledby="upgrade-title">
        <DialogHeader>
          <DialogTitle id="upgrade-title">Upgrade Your Plan</DialogTitle>
        </DialogHeader>
        {/* Modal content */}
      </DialogContent>
    </Dialog>
  );
}
```

---

**End of Component Hierarchy Document**
