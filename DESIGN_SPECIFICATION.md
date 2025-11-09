# User Management & Subscription System - Design Specification

## Executive Summary
This document outlines the complete design specification for an enterprise-grade user management and subscription system for the Legal AI Dashboard SaaS application. The design prioritizes clarity, professional aesthetics, and seamless user experience while maintaining accessibility and scalability.

---

## 1. Design Philosophy

### Core Principles
1. **Clarity Over Cleverness**: Every element serves a clear purpose
2. **Progressive Disclosure**: Show basic options first, advanced features on demand
3. **Data Transparency**: Users should always know their usage, limits, and billing status
4. **Frictionless Upgrades**: Make it easy to upgrade, reasonable to downgrade
5. **Trust Through Design**: Professional, secure, and reliable visual language

### Visual Design System

#### Color Palette
```
Primary Colors:
- Brand Blue: #2563eb (Interactive elements, CTAs)
- Brand Blue Hover: #1d4ed8
- Success Green: #10b981
- Warning Amber: #f59e0b
- Error Red: #ef4444
- Neutral Gray Scale: #f9fafb, #f3f4f6, #e5e7eb, #d1d5db, #9ca3af, #6b7280, #4b5563, #374151, #1f2937, #111827

Plan-Specific Colors:
- Free: #6b7280 (Gray)
- Professional: #2563eb (Blue)
- Enterprise: #7c3aed (Purple)
```

#### Typography Scale
```
Font Family: 'Inter', system-ui, sans-serif

Heading Scale:
- H1: 36px / 2.25rem (Bold, -0.025em tracking)
- H2: 30px / 1.875rem (Bold, -0.025em tracking)
- H3: 24px / 1.5rem (Semibold, -0.025em tracking)
- H4: 20px / 1.25rem (Semibold, -0.025em tracking)
- H5: 16px / 1rem (Semibold, normal tracking)

Body Scale:
- Large: 18px / 1.125rem (Regular/Medium)
- Base: 16px / 1rem (Regular/Medium)
- Small: 14px / 0.875rem (Regular/Medium)
- Extra Small: 12px / 0.75rem (Regular/Medium)
```

#### Spacing System
Based on 8px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

#### Border Radius
- Small: 6px (buttons, badges)
- Medium: 8px (cards, inputs)
- Large: 12px (large cards, modals)
- Extra Large: 16px (feature sections)

#### Shadows
```
Small: 0 1px 2px 0 rgb(0 0 0 / 0.05)
Medium: 0 4px 6px -1px rgb(0 0 0 / 0.1)
Large: 0 10px 15px -3px rgb(0 0 0 / 0.1)
Extra Large: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

---

## 2. Information Architecture

### Navigation Structure
```
Account Menu (User Dropdown)
├── Profile
│   ├── Personal Information
│   ├── Professional Details
│   ├── Security & Privacy
│   └── Session Management
├── Subscription & Billing
│   ├── Current Plan
│   ├── Plan Comparison
│   ├── Payment Methods
│   ├── Billing History
│   └── Usage & Limits
├── Settings
│   ├── General Settings
│   ├── Notification Preferences
│   ├── Integrations
│   └── Advanced Settings
└── Sign Out
```

### Page Hierarchy

#### Level 1: Account Dashboard (Overview)
Quick summary of key account information

#### Level 2: Dedicated Pages
- Profile Management
- Subscription & Billing
- Usage Dashboard
- Settings (tabbed interface)

---

## 3. Page-by-Page Specifications

### 3.1 Account Overview Dashboard

**Purpose**: Quick glance at account status, usage, and important actions

**Layout**: Grid-based dashboard with key metrics

**Components**:
1. **Welcome Header**
   - Personalized greeting with user name
   - Account status badge (Free/Pro/Enterprise)
   - Quick action button (Upgrade if free, Manage if paid)

2. **Usage Summary Cards** (3-column grid)
   - AI Queries: Progress bar, current/limit, percentage
   - Active Cases: Progress bar, current/limit, percentage
   - Storage: Progress bar, used/total, visual indicator

3. **Subscription Status Card**
   - Current plan with icon
   - Next billing date (if applicable)
   - Quick link to billing page
   - Renewal status indicator

4. **Recent Activity Timeline**
   - Last 5 significant events
   - Document uploads, AI queries, case creations
   - Timestamp for each event

5. **Quick Actions Panel**
   - Upload Document
   - Create New Case
   - Run AI Analysis
   - View Full Usage Stats

**Responsive Behavior**:
- Desktop: 3-column grid for usage cards
- Tablet: 2-column grid
- Mobile: Single column, cards stack

---

### 3.2 Profile Management Page

**URL**: `/account/profile`

**Layout**: Two-column layout (sidebar + main content)

#### Left Sidebar Navigation
```
- Personal Information (default)
- Professional Details
- Security & Privacy
- Session Management
```

#### Section 1: Personal Information

**Components**:

1. **Profile Photo Upload**
   - Large circular avatar (120px)
   - Upload button overlay on hover
   - Supported formats: JPG, PNG (max 5MB)
   - Automatic crop/resize interface
   - Fallback: Initials with brand color background

2. **Basic Information Form**
   ```
   Fields:
   - First Name* (text input)
   - Last Name* (text input)
   - Email Address* (text input, verified badge)
   - Phone Number (text input with country code selector)
   - Time Zone (searchable dropdown)
   - Language Preference (dropdown)
   ```

3. **Email Verification Status**
   - Badge showing "Verified" with checkmark (green)
   - Or "Unverified" with warning (amber) + Resend link
   - Shows last verification email sent timestamp

**Interaction**:
- Auto-save on blur for each field
- "Saving..." indicator
- Success toast notification
- Error inline validation

#### Section 2: Professional Details

**Form Fields**:
```
- Job Title (text input)
- Law Firm/Organization (text input)
- Bar Number (text input)
- Jurisdiction (multi-select dropdown)
- Legal Specialization (multi-select tags)
  Options: Corporate Law, Criminal Law, Family Law, IP Law, etc.
- Years of Experience (number input)
- Professional Website (URL input)
- LinkedIn Profile (URL input)
```

**Profile Visibility Settings**:
- Toggle: "Make my profile visible to other users"
- Toggle: "Show me in expert directory"
- Information tooltip explaining each option

#### Section 3: Security & Privacy

**Password Change Section**:
```
- Current Password (password input with show/hide)
- New Password (password input with strength meter)
- Confirm New Password (password input)
- Password Requirements Checklist:
  ✓ At least 8 characters
  ✓ One uppercase letter
  ✓ One lowercase letter
  ✓ One number
  ✓ One special character
```

**Two-Factor Authentication (2FA)**:
- Status indicator: Enabled/Disabled
- Enable 2FA Flow:
  1. Show QR code for authenticator app
  2. Manual entry code option
  3. Verification code input
  4. Recovery codes download (10 codes)
- Disable 2FA: Requires password confirmation

**Privacy Controls**:
```
Toggles:
- Allow analytics tracking
- Share usage data for improvements
- Receive product updates
- Allow AI training on anonymized data (opt-in)
```

**Data Management**:
- Export All Data button (generates ZIP with JSON)
- Delete Account button (requires confirmation modal)
  - Warning message about data loss
  - Requires typing "DELETE" to confirm
  - Requires password

#### Section 4: Session Management

**Active Sessions Table**:
```
Columns:
- Device/Browser (icon + name)
- Location (city, country with flag)
- IP Address
- Last Active (relative time)
- Actions (Revoke button)
```

**Current Session**: Highlighted with "This device" badge

**Bulk Actions**:
- "Sign Out All Other Devices" button (prominent, secondary style)
- Confirmation modal before executing

**Session History**:
- Toggle to show last 30 days of login history
- Table with: Timestamp, Device, Location, IP, Status (Success/Failed)

---

### 3.3 Subscription & Billing Page

**URL**: `/account/billing`

**Layout**: Full-width with sectioned content

#### Section 1: Current Plan Overview

**Plan Card (Large, Prominent)**:
```
Left Side:
- Plan Icon (Free/Pro/Enterprise badge)
- Plan Name (Large heading)
- Price (if applicable): "$49/month" or "Free Forever"
- Billing Cycle: "Monthly" or "Annual" with badge
- Status Badge: "Active" (green) or "Canceled" (red)

Right Side:
- Upgrade/Downgrade CTA button
- Manage Plan dropdown:
  - Change Billing Cycle
  - Update Payment Method
  - Cancel Subscription
  - View Invoice History
```

**Next Billing Information** (if paid plan):
- Next billing date with countdown: "Renews in 14 days (Jan 23, 2025)"
- Amount to be charged: "$49.00"
- Payment method preview: "Visa •••• 4242"
- Auto-renewal toggle switch

**Plan Features Included**:
Checklist of current plan features with checkmarks
```
✓ 50 Active Cases
✓ 500 AI Queries per month
✓ 5GB Storage
✓ Priority Email Support
✓ Advanced Analytics
✓ API Access
```

#### Section 2: Plan Comparison Table

**Interactive Comparison Grid**:

```
Header Row:
| Feature                    | Free      | Professional | Enterprise   |
|----------------------------|-----------|--------------|--------------|

Pricing Row (Highlighted):
| Monthly Price              | $0        | $49          | $199         |
| Annual Price (Save 20%)    | $0        | $470         | $1,910       |

Features (Grouped by Category):

CORE FEATURES:
| Active Cases               | 5         | 50           | Unlimited    |
| AI Queries/Month           | 50        | 500          | 5,000        |
| Storage                    | 100MB     | 5GB          | 50GB         |
| Document Uploads/Month     | 25        | 500          | Unlimited    |

AI CAPABILITIES:
| Document Analysis          | Basic     | Advanced     | Advanced     |
| Legal Research             | Limited   | Full Access  | Full Access  |
| Contract Review            | ✗         | ✓            | ✓            |
| Precedent Search           | ✗         | ✓            | ✓            |
| Custom AI Models           | ✗         | ✗            | ✓            |

SUPPORT & SERVICES:
| Support                    | Email     | Priority     | Dedicated    |
| Response Time              | 48h       | 12h          | 4h           |
| Onboarding                 | ✗         | ✓            | White Glove  |
| Training Sessions          | ✗         | Quarterly    | Monthly      |

INTEGRATIONS:
| API Access                 | ✗         | ✓            | ✓            |
| Webhooks                   | ✗         | 10           | Unlimited    |
| Third-party Integrations   | ✗         | ✓            | ✓            |
| SSO                        | ✗         | ✗            | ✓            |

COMPLIANCE & SECURITY:
| Data Encryption            | ✓         | ✓            | ✓            |
| Audit Logs                 | ✗         | 30 days      | Unlimited    |
| Advanced Permissions       | ✗         | ✗            | ✓            |
| SOC 2 Compliance           | ✗         | ✗            | ✓            |

Action Row:
| CTA Button                 | Current   | Upgrade      | Contact Sales|
```

**Interaction Design**:
- Highlight current plan column with subtle background
- Hover on feature shows tooltip with more details
- Click CTA opens upgrade modal
- Toggle between Monthly/Annual pricing (updates all prices)
- Feature comparison icons: ✓ (checkmark), ✗ (cross), or specific values

#### Section 3: Payment Methods

**Primary Payment Method Card**:
```
Card Display:
- Card brand icon (Visa, Mastercard, Amex)
- Card number (masked): •••• •••• •••• 4242
- Expiry date: "Expires 12/2025"
- "Default" badge
- Actions: Edit, Remove
```

**Add Payment Method Button**: Opens modal/slide-out panel

**Add Payment Method Modal**:
- Card number input with brand detection
- Expiry date (MM/YY format)
- CVC (with security tooltip)
- Cardholder name
- Billing address (with same as profile checkbox)
- Set as default toggle
- Secure payment badge (SSL, PCI compliant icons)

**Saved Payment Methods**:
- List of all saved cards
- Radio button to select default
- Delete option (requires confirmation)

#### Section 4: Billing History

**Invoice Table**:
```
Columns:
- Invoice Number (#INV-2025-001)
- Date (Jan 1, 2025)
- Description (Professional Plan - Monthly)
- Amount ($49.00)
- Status (Paid/Failed badge)
- Actions (Download PDF, View Details)
```

**Filters**:
- Date range picker (Last 30 days, Last 3 months, Last year, Custom)
- Status filter (All, Paid, Failed, Pending)
- Export all invoices button

**Invoice Details Modal**:
```
Header:
- Invoice number
- Issue date
- Due date (if applicable)
- Status badge

Billing Information:
- Bill to (user's address)
- Bill from (company address)

Line Items:
- Description | Quantity | Unit Price | Amount
- Subtotal
- Tax (if applicable)
- Total

Footer:
- Download PDF button
- Print button
- Email invoice button
```

**Payment Failed Section** (if applicable):
- Alert banner showing failed payment
- Reason for failure
- "Update Payment Method" CTA
- Retry payment button
- Grace period countdown

#### Section 5: Usage & Limits Dashboard

**Integration Note**: This section can also be accessed from `/account/usage`

**Month Selector**: Dropdown to view previous months (last 12 months)

**Usage Overview Cards** (4-column grid):

**Card 1: AI Queries**
```
Icon: Brain/Sparkles
Title: AI Queries
Current Usage: 347 / 500 (69%)
Progress Bar: Visual fill indicator
Trend: +12% vs last month (with arrow)
Status: "Within Limits" (green) or "Approaching Limit" (amber)
```

**Card 2: Active Cases**
```
Icon: Folder
Title: Active Cases
Current Usage: 28 / 50 (56%)
Progress Bar: Visual fill indicator
Trend: +5 vs last month
Status: "Within Limits"
```

**Card 3: Storage**
```
Icon: Database
Title: Storage Used
Current Usage: 2.3 GB / 5 GB (46%)
Progress Bar: Visual fill indicator
Breakdown: Documents (1.8GB), Attachments (0.5GB)
Status: "Within Limits"
```

**Card 4: Document Uploads**
```
Icon: Upload
Title: Documents This Month
Current Usage: 234 / 500 (47%)
Progress Bar: Visual fill indicator
Trend: -8% vs last month
Status: "Within Limits"
```

**Usage Over Time Chart**:
- Line chart showing last 6 months
- Multiple lines for different metrics
- Toggleable metrics (checkboxes)
- Hover tooltips showing exact values
- Responsive: switches to bar chart on mobile

**Detailed Usage Breakdown Table**:
```
Columns:
- Date
- AI Queries Used
- Documents Uploaded
- Storage Added
- Cases Created
```

**Usage Alerts Section**:
```
Threshold Notifications:
- 50% of limit: Info notification
- 75% of limit: Warning notification
- 90% of limit: Critical warning
- 100% of limit: Limit reached, upgrade prompt

Alert Settings:
- Toggle email notifications for usage alerts
- Set custom threshold percentages
```

**Upgrade Prompt** (when approaching limits):
```
Banner Design:
"You've used 90% of your AI queries this month"
"Upgrade to Professional for 10x more queries"
[Upgrade Now] button
[Maybe Later] dismiss link
```

---

### 3.4 Settings Pages

**URL**: `/account/settings`

**Layout**: Tabbed interface with left sidebar navigation

#### Tabs Structure:
1. General Settings (Default)
2. Notifications
3. Integrations
4. Advanced
5. Privacy & Data

---

#### Tab 1: General Settings

**Section: Preferences**
```
- Language (dropdown: English, Spanish, French, etc.)
- Time Zone (searchable dropdown with UTC offset)
- Date Format (dropdown: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Time Format (radio: 12-hour, 24-hour)
- Currency (dropdown: USD, EUR, GBP, etc.)
```

**Section: Dashboard Defaults**
```
- Default Legal Type (dropdown: Civil, Criminal, Corporate, etc.)
- Default Case View (dropdown: List, Grid, Timeline)
- Cases Per Page (dropdown: 10, 25, 50, 100)
- Start Page (dropdown: Dashboard, Cases, Recent Activity)
```

**Section: Editor Preferences**
```
- Default Font (dropdown: Inter, Arial, Times New Roman)
- Font Size (slider: 12px - 18px)
- Line Height (slider: 1.2 - 2.0)
- Editor Theme (radio: Light, Dark, Auto)
```

**Section: Accessibility**
```
- Reduce Motion (toggle)
- High Contrast Mode (toggle)
- Keyboard Navigation Hints (toggle)
- Screen Reader Optimizations (toggle)
```

---

#### Tab 2: Notification Preferences

**Section: Email Notifications**

**Categories with individual toggles**:
```
Account & Billing:
- [ ] Subscription renewals
- [ ] Payment receipts
- [ ] Usage limit warnings
- [ ] Plan upgrade opportunities

Case Activity:
- [ ] New case assignments
- [ ] Case status changes
- [ ] Deadline reminders
- [ ] Document uploaded to case

AI & Analysis:
- [ ] AI analysis complete
- [ ] Research results ready
- [ ] Weekly AI insights digest

System Updates:
- [ ] New features
- [ ] Maintenance notifications
- [ ] Security alerts
```

**Email Frequency**:
- Radio buttons: Instant, Daily Digest, Weekly Digest

**Section: In-App Notifications**
```
- [ ] Browser push notifications (requires permission)
- [ ] Sound for new notifications
- [ ] Desktop notifications
```

**Section: Communication Preferences**
```
- [ ] Product updates and newsletters
- [ ] Legal industry insights
- [ ] Educational content and webinars
- [ ] Partner offers
```

**Notification Settings Summary**:
- "Email me a test notification" button
- "Notification history" link
- Last notification sent timestamp

---

#### Tab 3: Integrations

**Section: Connected Applications**

**Integration Cards** (grid layout):

**Card Template**:
```
[App Icon]
App Name
Connected | Not Connected status badge
Description (1-2 lines)
[Configure] or [Connect] button
Last synced: timestamp (if connected)
```

**Available Integrations**:
1. **Slack Integration**
   - Post case updates to channels
   - Receive AI analysis notifications
   - Settings: Channel selector, notification types

2. **Microsoft 365**
   - Sync calendar events
   - Import documents from OneDrive
   - Settings: Calendar sync, folder access

3. **Google Workspace**
   - Import from Google Drive
   - Calendar integration
   - Settings: Drive folder, calendar selection

4. **Dropbox**
   - Auto-sync case documents
   - Settings: Folder selection, sync frequency

5. **Zapier**
   - Custom workflow automation
   - Settings: Zapier account linking

6. **Webhook Integration**
   - Custom webhooks for events
   - Settings: Add/manage webhook URLs

**Section: API Access** (Professional/Enterprise only)

**API Key Management**:
```
Active API Keys Table:
- Key Name
- Key Preview (first/last 4 chars)
- Created Date
- Last Used
- Actions (Regenerate, Revoke)

[Create New API Key] button

API Key Creation Modal:
- Key Name (text input)
- Expiration (dropdown: Never, 30 days, 90 days, 1 year)
- Permissions (checkboxes):
  - Read Cases
  - Write Cases
  - Read Documents
  - Write Documents
  - AI Operations
- [Generate Key] button
- Copy key warning (show only once)
```

**API Documentation Link**: Opens in new tab

**Rate Limits Display**:
```
Current Usage:
- Requests: 1,234 / 10,000 per month
- Remaining: 8,766
- Resets: Jan 1, 2025
```

---

#### Tab 4: Advanced Settings

**Section: Data Export**

**Export Options**:
```
Export All Data:
- [ ] Cases and case details
- [ ] Documents and attachments
- [ ] AI analysis results
- [ ] User settings and preferences
- [ ] Activity logs

Format: (dropdown) JSON, CSV, PDF Report

[Export Data] button
→ Generates ZIP file, sends download link to email
```

**Export History**:
```
Table:
- Request Date
- Data Type
- Status (Pending, Ready, Expired)
- Download Link (24-hour expiration)
```

**Section: Import Data**

**Import from CSV**:
```
- Template download link
- File upload area (drag & drop)
- Field mapping interface
- Validation preview
- [Import] button
```

**Section: Danger Zone** (red border)

**Account Actions**:
```
1. Reset All Settings
   Description: Restore all settings to defaults
   [Reset Settings] button

2. Clear All Data
   Description: Delete all cases, documents, and history
   [Clear Data] button (requires password)

3. Delete Account
   Description: Permanently delete your account and all data
   [Delete Account] button (requires confirmation modal)
```

**Delete Account Modal**:
```
Warning:
"This action cannot be undone. All your data will be permanently deleted."

Consequences:
- All cases will be deleted
- All documents will be deleted
- All AI analysis history will be lost
- Active subscription will be canceled
- No refunds will be issued

Confirmation:
- Type "DELETE" to confirm
- Enter password
- [Cancel] [Delete My Account]
```

---

#### Tab 5: Privacy & Data

**Section: Data Privacy**

**Privacy Controls**:
```
- [ ] Allow analytics tracking for product improvements
- [ ] Share anonymized usage data with partners
- [ ] Use my data for AI model training (anonymized)
- [ ] Include my profile in user directory
- [ ] Allow third-party integrations to access my data
```

**Section: Data Retention**

**Retention Policies**:
```
Dropdown options:
- Delete after 30 days of inactivity
- Delete after 90 days of inactivity
- Delete after 1 year of inactivity
- Keep indefinitely (default)

Applies to:
- Closed cases
- Archived documents
- AI analysis history
```

**Section: Cookie Preferences**

**Cookie Categories**:
```
1. Essential Cookies (always active)
   Description: Required for core functionality

2. Analytics Cookies (toggle)
   Description: Help us understand how you use the platform

3. Marketing Cookies (toggle)
   Description: Used to show relevant ads and content

4. Preference Cookies (toggle)
   Description: Remember your settings and preferences
```

**Section: Data Processing**

**Information Display**:
```
- Data storage location: (e.g., "US East, AWS")
- Data encryption: "AES-256 at rest, TLS 1.3 in transit"
- Compliance: Badges (GDPR, CCPA, SOC 2)
- Last updated: timestamp
```

**Download Links**:
- Privacy Policy (PDF)
- Terms of Service (PDF)
- Data Processing Agreement (PDF)
- Cookie Policy (PDF)

---

## 4. Component Specifications

### 4.1 Core Components

#### UserAvatar Component
```typescript
Props:
- src?: string (image URL)
- alt: string (user name)
- size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (24, 32, 40, 48, 64px)
- fallback?: string (initials)
- status?: 'online' | 'offline' | 'busy' (status indicator dot)
- editable?: boolean (shows upload on hover)
```

#### PlanBadge Component
```typescript
Props:
- plan: 'free' | 'professional' | 'enterprise'
- size: 'sm' | 'md' | 'lg'
- showIcon?: boolean

Design:
- Free: Gray background, dark gray text
- Professional: Blue background, white text
- Enterprise: Purple background, white text
- Icon: Crown (Pro), Star (Enterprise)
```

#### ProgressBar Component
```typescript
Props:
- current: number
- max: number
- showPercentage?: boolean
- showLabel?: boolean
- status?: 'normal' | 'warning' | 'critical' (< 75%, 75-90%, > 90%)
- animated?: boolean

Color Coding:
- Normal: Blue
- Warning: Amber
- Critical: Red
```

#### UsageCard Component
```typescript
Props:
- title: string
- icon: LucideIcon
- current: number
- max: number
- unit: string
- trend?: { value: number, direction: 'up' | 'down' }
- status?: 'normal' | 'warning' | 'critical'

Layout:
- Icon + Title (top)
- Large number display (current / max)
- Progress bar
- Trend indicator (bottom)
```

#### SettingRow Component
```typescript
Props:
- label: string
- description?: string
- control: ReactNode (toggle, input, dropdown)
- helpText?: string
- badge?: string (Pro, Enterprise)

Layout:
- Left: Label + Description
- Right: Control element
- Help icon with tooltip
```

#### PricingCard Component
```typescript
Props:
- plan: PlanType
- price: number
- billingCycle: 'monthly' | 'annual'
- features: string[]
- highlighted?: boolean (current plan)
- onSelect: () => void

Layout:
- Plan badge/icon (top)
- Price (large, prominent)
- Feature list with checkmarks
- CTA button (bottom)
```

---

### 4.2 Advanced Components

#### BillingCycleToggle Component
```typescript
Props:
- value: 'monthly' | 'annual'
- onChange: (value) => void
- savings?: number (show "Save 20%" badge)

Design:
- Pill-style toggle
- Smooth transition
- Savings badge on annual option
```

#### PaymentMethodCard Component
```typescript
Props:
- brand: 'visa' | 'mastercard' | 'amex' | 'discover'
- last4: string
- expiryMonth: number
- expiryYear: number
- isDefault?: boolean
- onEdit: () => void
- onDelete: () => void

Layout:
- Card brand icon + masked number
- Expiry date
- Default badge (if applicable)
- Action menu (3 dots)
```

#### InvoiceRow Component
```typescript
Props:
- invoice: Invoice
- onDownload: () => void
- onView: () => void

Design:
- Expandable row (click to see details)
- Status badge (Paid, Failed, Pending)
- Download icon button
```

#### UsageChart Component
```typescript
Props:
- data: ChartData[]
- metrics: string[] (which lines to show)
- timeRange: 'week' | 'month' | 'quarter' | 'year'

Design:
- Recharts LineChart
- Legend with toggles
- Responsive: bar chart on mobile
- Tooltips on hover
- Gradient fill under lines
```

#### NotificationPreferenceGroup Component
```typescript
Props:
- category: string
- notifications: NotificationOption[]
- value: string[] (enabled notification IDs)
- onChange: (value) => void

Layout:
- Category header (collapsible)
- List of toggle switches
- "Select All" / "Deselect All" links
```

#### IntegrationCard Component
```typescript
Props:
- integration: Integration
- connected: boolean
- onConnect: () => void
- onConfigure: () => void
- onDisconnect: () => void

Layout:
- App icon + name
- Connection status badge
- Description
- CTA button
- Last sync timestamp (if connected)
```

#### APIKeyRow Component
```typescript
Props:
- apiKey: APIKey
- onRegenerate: () => void
- onRevoke: () => void
- onCopy: () => void

Layout:
- Key name + preview
- Created date
- Last used indicator
- Action menu
```

#### DangerZoneCard Component
```typescript
Props:
- title: string
- description: string
- actionLabel: string
- onAction: () => void
- requireConfirmation?: boolean

Design:
- Red border
- Warning icon
- Secondary button (red text)
```

---

## 5. User Flows

### 5.1 Upgrade Flow

**Entry Points**:
1. Usage limit warning banner
2. Billing page "Upgrade" button
3. Plan comparison table CTA
4. Feature locked state (Pro/Enterprise only feature)

**Flow Steps**:

1. **Plan Selection**
   - Show plan comparison if not already visible
   - Highlight selected plan
   - Monthly vs Annual toggle
   - Show savings calculation for annual

2. **Billing Cycle Confirmation**
   - Confirm monthly vs annual choice
   - Show total amount and next billing date
   - Show what changes (new limits)

3. **Payment Method**
   - If saved: Select existing card
   - If new: Payment form with Stripe Elements
   - Billing address form
   - Set as default checkbox

4. **Review & Confirm**
   - Summary of changes:
     - Plan: Free → Professional
     - Price: $0 → $49/month
     - Next billing: Feb 1, 2025
   - New limits summary
   - Terms acceptance checkbox
   - [Confirm Upgrade] button

5. **Processing**
   - Loading state with spinner
   - "Processing your upgrade..." message

6. **Success**
   - Success modal with confetti animation
   - "Welcome to Professional!" message
   - Summary of new limits
   - [Start Using Professional Features] CTA
   - Email confirmation sent indicator

7. **Post-Upgrade**
   - Redirect to dashboard
   - Show "What's New" tooltip tour
   - Update all UI elements (badges, limits)

**Error Handling**:
- Payment failed: Show error, allow retry or change payment method
- Invalid card: Inline validation with helpful messages
- Network error: Retry mechanism, customer support link

---

### 5.2 Downgrade Flow

**Entry Points**:
1. Billing page "Manage Plan" → Downgrade
2. Cancel subscription flow alternative

**Flow Steps**:

1. **Downgrade Initiation**
   - "Are you sure?" confirmation
   - Show what will be lost:
     - Current: 50 cases → New: 5 cases
     - Current: 500 AI queries → New: 50 queries
     - Current: 5GB storage → New: 100MB storage

2. **Data Impact Warning**
   - If over new limits: "You have 28 active cases but Free plan allows only 5"
   - Required actions:
     - Archive 23 cases, or
     - Delete cases, or
     - Stay on current plan

3. **Feedback Collection**
   - "Why are you downgrading?" (optional)
   - Multi-select: Too expensive, Not using features, Found alternative, etc.
   - Open text feedback

4. **Downgrade Confirmation**
   - Effective date: End of current billing period
   - No refund for current period (prorated credit if annual)
   - Can continue using current plan until end date

5. **Success**
   - Confirmation modal
   - Email confirmation
   - Calendar reminder for downgrade date

**Edge Cases**:
- Over limit: Must resolve before downgrade completes
- Active features: Warning about losing integrations, API keys, etc.

---

### 5.3 Cancellation Flow

**Entry Points**:
1. Billing page "Manage Plan" → Cancel Subscription

**Flow Steps**:

1. **Cancellation Initiation**
   - "We're sorry to see you go" message
   - Retention offer: 20% off for 3 months (conditional)

2. **Retention Attempt**
   - Show what they'll lose
   - Offer pause subscription (1-3 months)
   - Offer downgrade to Free instead

3. **Feedback Collection**
   - Required: Reason for cancellation
   - Optional: Additional comments
   - Contact support offer

4. **Final Confirmation**
   - Access until end of billing period
   - No refund policy reminder
   - Data retention policy (30 days)
   - Type "CANCEL" to confirm

5. **Post-Cancellation**
   - Confirmation email
   - Export data reminder
   - Reactivation link (valid for 30 days)
   - Survey invitation

---

### 5.4 First-Time User Onboarding

**Triggered**: First login after signup

**Flow Steps**:

1. **Welcome Modal**
   - "Welcome to Legal AI Dashboard!" headline
   - Quick intro (2-3 sentences)
   - [Start Tour] or [Skip for Now]

2. **Profile Setup** (Step 1/4)
   - Upload profile photo
   - Complete professional details
   - Progress indicator at top
   - [Skip] or [Next]

3. **Choose Your Plan** (Step 2/4)
   - Plan comparison (simplified view)
   - "You can always upgrade later" reassurance
   - [Start with Free] or [Upgrade Now]

4. **Integrate Your Tools** (Step 3/4)
   - Popular integrations grid
   - "Connect now or skip and do it later"
   - [Connect] buttons or [Skip]

5. **Create Your First Case** (Step 4/4)
   - Guided case creation form
   - Sample data pre-filled
   - [Create Case] or [I'll Do This Later]

6. **Onboarding Complete**
   - Success message
   - Resources:
     - Help documentation
     - Video tutorials
     - Support contact
   - [Go to Dashboard]

**Progress Persistence**:
- Save progress at each step
- Can resume later from account menu
- Dismissible, doesn't block usage

---

## 6. Responsive Design Specifications

### Breakpoints
```
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
Large Desktop: > 1440px
```

### Mobile Adaptations

#### Navigation
- Hamburger menu for account navigation
- Bottom tab bar for quick actions
- Swipeable tabs on settings pages

#### Usage Cards
- Stack vertically
- Full-width cards
- Simplified chart views (bar instead of line)

#### Plan Comparison Table
- Horizontal scroll
- Sticky first column (feature names)
- Simplified view with expand/collapse sections

#### Forms
- Full-width inputs
- Larger touch targets (44px minimum)
- Floating labels
- Sticky form actions at bottom

#### Modals
- Slide up from bottom (native feel)
- Full screen on small devices
- Swipe down to dismiss

### Tablet Adaptations

#### Usage Dashboard
- 2-column grid
- Side-by-side plan comparison
- Collapsible sidebar navigation

#### Settings
- Left sidebar visible
- Main content area responsive

---

## 7. Accessibility Specifications

### WCAG 2.1 AA Compliance

#### Color Contrast
- Text: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- UI components: Minimum 3:1 ratio
- Status indicators: Don't rely on color alone

#### Keyboard Navigation
- Logical tab order
- Focus indicators (2px blue outline)
- Skip links for main content
- Keyboard shortcuts documented
- No keyboard traps

#### Screen Readers
- Semantic HTML structure
- ARIA labels for interactive elements
- Live regions for dynamic updates
- Descriptive alt text for images
- Form labels and error associations

#### Focus Management
- Focus moves logically in modals
- Return focus after modal close
- Focus trap in modals
- Visible focus styles

#### Content Structure
- Heading hierarchy (no skipped levels)
- Landmark regions (header, main, nav, footer)
- Lists for related items
- Tables for tabular data

#### Error Handling
- Error messages associated with fields
- Clear error descriptions
- Suggested fixes
- Error summary at form top

---

## 8. Performance Specifications

### Loading States

#### Skeleton Screens
- Usage cards: Animated skeleton
- Tables: Row skeletons
- Charts: Loading spinner in center
- Forms: Field skeletons

#### Progressive Loading
- Load critical content first
- Lazy load images
- Defer non-critical scripts
- Show partial content while loading

### Optimization Targets

```
Page Load Performance:
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

API Response Times:
- Profile data: < 200ms
- Usage stats: < 300ms
- Billing history: < 500ms
- Charts data: < 400ms
```

### Caching Strategy
- Cache user profile (5 min)
- Cache usage stats (1 min)
- Cache plan details (10 min)
- Invalidate on updates

---

## 9. Security Specifications

### Authentication
- Session-based auth with JWT
- Session timeout: 7 days (configurable)
- Remember me option (30 days)
- Secure, httpOnly cookies

### Password Security
- Bcrypt hashing (cost factor: 12)
- Password strength requirements enforced
- Rate limiting on login attempts (5 attempts/15 min)
- Account lockout after 10 failed attempts

### 2FA Implementation
- TOTP-based (RFC 6238)
- 30-second time step
- 6-digit codes
- Recovery codes (10, one-time use)

### API Security
- API keys: 32-character random strings
- Rate limiting per key
- IP whitelisting option (Enterprise)
- Automatic key rotation recommendation

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII handling compliance (GDPR, CCPA)
- Audit logging for sensitive actions

### Session Management
- Concurrent session limit: 5
- Session invalidation on password change
- Activity tracking per session
- Geographic anomaly detection

---

## 10. Analytics & Tracking

### User Behavior Tracking

**Events to Track**:
```
Account Actions:
- profile_updated
- password_changed
- 2fa_enabled
- 2fa_disabled

Subscription Events:
- plan_viewed
- upgrade_initiated
- upgrade_completed
- downgrade_initiated
- subscription_canceled

Usage Events:
- usage_limit_warning_shown
- usage_limit_reached
- usage_exported

Settings Events:
- notification_preferences_updated
- integration_connected
- integration_disconnected
- api_key_created

Engagement Events:
- page_viewed
- feature_used
- help_accessed
- support_contacted
```

### Analytics Dashboard (Internal)
- User activation funnel
- Upgrade conversion rates
- Churn indicators
- Feature adoption rates
- Support ticket correlation

---

## 11. Error States & Edge Cases

### Empty States

**No Billing History**:
```
Illustration: Invoice icon
Headline: "No invoices yet"
Description: "Your billing history will appear here once you upgrade to a paid plan."
CTA: [View Plans]
```

**No Active Sessions**:
```
Headline: "Only this device is logged in"
Description: "You'll see other active sessions here when you log in from multiple devices."
```

**No Integrations**:
```
Headline: "Connect your tools"
Description: "Integrate with your favorite apps to supercharge your workflow."
CTA: [Browse Integrations]
```

### Error States

**Payment Failed**:
```
Alert Banner (Red):
Icon: Warning triangle
Message: "Your payment failed. Please update your payment method to continue using Professional features."
CTA: [Update Payment] [Contact Support]
```

**Over Limit**:
```
Alert Banner (Amber):
Icon: Alert circle
Message: "You've reached your monthly limit for AI queries (500/500). Upgrade to continue using AI features."
CTA: [Upgrade Now] [View Usage]
```

**API Error**:
```
Inline Error:
Icon: X circle
Message: "We couldn't load your data. Please try again."
CTA: [Retry] [Contact Support]
```

### Edge Cases

**Downgrading with Excess Data**:
- Show data cleanup wizard
- Option to export excess data
- Archive vs. Delete options
- Deadline before downgrade completes

**Payment Method Expired**:
- Email notification 7 days before expiry
- Banner in app
- Grace period: 3 days
- Automatic downgrade to Free if not updated

**Concurrent Edits** (multiple sessions):
- Show "This data was updated in another session" warning
- Option to reload or keep local changes
- Last-write-wins with confirmation

**Large Data Exports**:
- Background processing
- Email when ready
- Progress indicator
- 24-hour download link

---

## 12. Notification System

### In-App Notifications

**Notification Center**:
- Bell icon in header (badge count)
- Dropdown panel with recent notifications
- Mark as read/unread
- Clear all option
- "See all" link to full history page

**Notification Types**:
1. **Info**: Blue icon, general updates
2. **Success**: Green checkmark, confirmations
3. **Warning**: Amber alert, approaching limits
4. **Error**: Red X, failures

**Notification Actions**:
- Primary action button in notification
- Dismiss button
- Snooze option (remind me later)

### Email Notifications

**Transactional Emails**:
1. **Welcome Email** (immediate)
2. **Payment Receipt** (immediate)
3. **Subscription Renewal** (7 days before, 1 day before)
4. **Usage Limit Warning** (at 75%, 90%, 100%)
5. **Payment Failed** (immediate + retry reminder)
6. **Password Changed** (immediate)
7. **New Device Login** (immediate)

**Email Design**:
- Professional, branded template
- Clear subject lines
- Plain text alternative
- One-click unsubscribe
- Footer with company info

---

## 13. Internationalization (i18n)

### Supported Languages (Phase 1)
- English (US) - Default
- Spanish (ES)
- French (FR)
- German (DE)

### i18n Considerations

**Text**:
- All strings externalized
- RTL support ready (future)
- Pluralization rules
- Date/time localization
- Number formatting

**Currency**:
- Display in user's preferred currency
- Charge in USD (backend)
- Real-time exchange rates
- Currency symbol positioning

**Date/Time**:
- User's timezone
- Relative times ("2 hours ago")
- Configurable format
- Calendar localization

---

## 14. Success Metrics

### Key Performance Indicators

**User Engagement**:
- Daily Active Users (DAU)
- Profile completion rate
- Settings configuration rate
- Notification opt-in rate

**Revenue Metrics**:
- Free to Paid conversion rate: Target 10%
- Upgrade completion rate: Target 80%
- Churn rate: Target < 5% monthly
- Monthly Recurring Revenue (MRR) growth

**User Experience**:
- Time to complete upgrade: Target < 2 min
- Error rate: Target < 1%
- Support tickets per feature: Target < 0.5%
- User satisfaction (NPS): Target > 50

**Performance**:
- Page load times: < 2.5s
- API response times: < 300ms
- Uptime: > 99.9%
- Error rate: < 0.1%

---

## 15. Future Enhancements

### Phase 2 Features
- Team accounts (multiple users per subscription)
- Custom roles and permissions
- Advanced analytics dashboard
- White-label options (Enterprise)
- Custom integrations via API

### Phase 3 Features
- Mobile app (iOS/Android)
- Offline mode
- Advanced automation (Zapier-like)
- AI-powered recommendations
- Referral program

---

## Appendix A: Design Tokens

### Color Tokens
```css
/* Primary */
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;

/* Success */
--color-success-500: #10b981;
--color-success-600: #059669;

/* Warning */
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;

/* Error */
--color-error-500: #ef4444;
--color-error-600: #dc2626;

/* Neutral */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-900: #111827;
```

### Typography Tokens
```css
--font-sans: 'Inter', system-ui, sans-serif;
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
```

### Spacing Tokens
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

---

## Appendix B: Component Library

**Recommended Components** (from shadcn/ui):
- Button
- Input
- Select
- Switch
- Checkbox
- Radio Group
- Textarea
- Label
- Card
- Badge
- Avatar
- Progress
- Tabs
- Table
- Modal/Dialog
- Dropdown Menu
- Toast
- Alert
- Tooltip
- Separator

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-09 | Design Team | Initial specification |

---

**End of Design Specification Document**
