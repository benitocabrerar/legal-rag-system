-- ============================================================================
-- FIX CALENDAR & TASKS COLUMN NAMES
-- ============================================================================
-- The migration created columns with camelCase but Prisma expects snake_case
-- This script fixes all column names to match the Prisma schema @map() directives
-- ============================================================================

\echo '🔧 Fixing column names in events, tasks, and finance tables...'
\echo ''

-- Fix events table column names
\echo 'Fixing events table...'
ALTER TABLE events
  RENAME COLUMN "meetingLink" TO meeting_link;

ALTER TABLE events
  RENAME COLUMN "startTime" TO start_time;

ALTER TABLE events
  RENAME COLUMN "endTime" TO end_time;

ALTER TABLE events
  RENAME COLUMN "allDay" TO all_day;

ALTER TABLE events
  RENAME COLUMN "isRecurring" TO is_recurring;

ALTER TABLE events
  RENAME COLUMN "recurrenceRule" TO recurrence_rule;

ALTER TABLE events
  RENAME COLUMN "recurrenceEnd" TO recurrence_end;

ALTER TABLE events
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE events
  RENAME COLUMN "createdBy" TO created_by;

ALTER TABLE events
  RENAME COLUMN "isPrivate" TO is_private;

ALTER TABLE events
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE events
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Events table fixed'
\echo ''

-- Fix event_participants table
\echo 'Fixing event_participants table...'
ALTER TABLE event_participants
  RENAME COLUMN "eventId" TO event_id;

ALTER TABLE event_participants
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE event_participants
  RENAME COLUMN "responseTime" TO response_time;

ALTER TABLE event_participants
  RENAME COLUMN "createdAt" TO created_at;

\echo '✓ Event participants table fixed'
\echo ''

-- Fix event_reminders table
\echo 'Fixing event_reminders table...'
ALTER TABLE event_reminders
  RENAME COLUMN "eventId" TO event_id;

ALTER TABLE event_reminders
  RENAME COLUMN "minutesBefore" TO minutes_before;

ALTER TABLE event_reminders
  RENAME COLUMN "recipientUserId" TO recipient_user_id;

ALTER TABLE event_reminders
  RENAME COLUMN "recipientEmail" TO recipient_email;

ALTER TABLE event_reminders
  RENAME COLUMN "sentAt" TO sent_at;

ALTER TABLE event_reminders
  RENAME COLUMN "errorMessage" TO error_message;

ALTER TABLE event_reminders
  RENAME COLUMN "createdAt" TO created_at;

\echo '✓ Event reminders table fixed'
\echo ''

-- Fix tasks table
\echo 'Fixing tasks table...'
ALTER TABLE tasks
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE tasks
  RENAME COLUMN "assignedTo" TO assigned_to;

ALTER TABLE tasks
  RENAME COLUMN "createdBy" TO created_by;

ALTER TABLE tasks
  RENAME COLUMN "dueDate" TO due_date;

ALTER TABLE tasks
  RENAME COLUMN "startDate" TO start_date;

ALTER TABLE tasks
  RENAME COLUMN "completedAt" TO completed_at;

ALTER TABLE tasks
  RENAME COLUMN "estimatedHours" TO estimated_hours;

ALTER TABLE tasks
  RENAME COLUMN "actualHours" TO actual_hours;

ALTER TABLE tasks
  RENAME COLUMN "isRecurring" TO is_recurring;

ALTER TABLE tasks
  RENAME COLUMN "recurrenceRule" TO recurrence_rule;

ALTER TABLE tasks
  RENAME COLUMN "parentTaskId" TO parent_task_id;

ALTER TABLE tasks
  RENAME COLUMN "dependsOn" TO depends_on;

ALTER TABLE tasks
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE tasks
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Tasks table fixed'
\echo ''

-- Fix task_checklist_items table
\echo 'Fixing task_checklist_items table...'
ALTER TABLE task_checklist_items
  RENAME COLUMN "taskId" TO task_id;

ALTER TABLE task_checklist_items
  RENAME COLUMN "isCompleted" TO is_completed;

ALTER TABLE task_checklist_items
  RENAME COLUMN "displayOrder" TO display_order;

ALTER TABLE task_checklist_items
  RENAME COLUMN "completedAt" TO completed_at;

ALTER TABLE task_checklist_items
  RENAME COLUMN "completedBy" TO completed_by;

ALTER TABLE task_checklist_items
  RENAME COLUMN "createdAt" TO created_at;

\echo '✓ Task checklist items table fixed'
\echo ''

-- Fix task_history table
\echo 'Fixing task_history table...'
ALTER TABLE task_history
  RENAME COLUMN "taskId" TO task_id;

ALTER TABLE task_history
  RENAME COLUMN "userId" TO user_id;

\echo '✓ Task history table fixed'
\echo ''

-- Fix notification_templates table
\echo 'Fixing notification_templates table...'
ALTER TABLE notification_templates
  RENAME COLUMN "bodyTemplate" TO body_template;

ALTER TABLE notification_templates
  RENAME COLUMN "isActive" TO is_active;

ALTER TABLE notification_templates
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE notification_templates
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Notification templates table fixed'
\echo ''

-- Fix notification_logs table
\echo 'Fixing notification_logs table...'
ALTER TABLE notification_logs
  RENAME COLUMN "templateId" TO template_id;

ALTER TABLE notification_logs
  RENAME COLUMN "userId" TO user_id;

ALTER TABLE notification_logs
  RENAME COLUMN "sentAt" TO sent_at;

ALTER TABLE notification_logs
  RENAME COLUMN "readAt" TO read_at;

ALTER TABLE notification_logs
  RENAME COLUMN "errorMessage" TO error_message;

ALTER TABLE notification_logs
  RENAME COLUMN "createdAt" TO created_at;

\echo '✓ Notification logs table fixed'
\echo ''

-- Fix agreements table
\echo 'Fixing agreements table...'
ALTER TABLE agreements
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE agreements
  RENAME COLUMN "agreementType" TO agreement_type;

ALTER TABLE agreements
  RENAME COLUMN "startDate" TO start_date;

ALTER TABLE agreements
  RENAME COLUMN "endDate" TO end_date;

ALTER TABLE agreements
  RENAME COLUMN "hourlyRate" TO hourly_rate;

ALTER TABLE agreements
  RENAME COLUMN "fixedFee" TO fixed_fee;

ALTER TABLE agreements
  RENAME COLUMN "contingencyPercentage" TO contingency_percentage;

ALTER TABLE agreements
  RENAME COLUMN "retainerAmount" TO retainer_amount;

ALTER TABLE agreements
  RENAME COLUMN "isActive" TO is_active;

ALTER TABLE agreements
  RENAME COLUMN "signedAt" TO signed_at;

ALTER TABLE agreements
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE agreements
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Agreements table fixed'
\echo ''

-- Fix service_items table
\echo 'Fixing service_items table...'
ALTER TABLE service_items
  RENAME COLUMN "invoiceId" TO invoice_id;

ALTER TABLE service_items
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE service_items
  RENAME COLUMN "performedBy" TO performed_by;

ALTER TABLE service_items
  RENAME COLUMN "createdAt" TO created_at;

\echo '✓ Service items table fixed'
\echo ''

-- Fix finance_invoices table
\echo 'Fixing finance_invoices table...'
ALTER TABLE finance_invoices
  RENAME COLUMN "invoiceNumber" TO invoice_number;

ALTER TABLE finance_invoices
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE finance_invoices
  RENAME COLUMN "agreementId" TO agreement_id;

ALTER TABLE finance_invoices
  RENAME COLUMN "issueDate" TO issue_date;

ALTER TABLE finance_invoices
  RENAME COLUMN "dueDate" TO due_date;

ALTER TABLE finance_invoices
  RENAME COLUMN "taxRate" TO tax_rate;

ALTER TABLE finance_invoices
  RENAME COLUMN "taxAmount" TO tax_amount;

ALTER TABLE finance_invoices
  RENAME COLUMN "paidAmount" TO paid_amount;

ALTER TABLE finance_invoices
  RENAME COLUMN "balanceDue" TO balance_due;

ALTER TABLE finance_invoices
  RENAME COLUMN "paymentTerms" TO payment_terms;

ALTER TABLE finance_invoices
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE finance_invoices
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Finance invoices table fixed'
\echo ''

-- Fix finance_payments table
\echo 'Fixing finance_payments table...'
ALTER TABLE finance_payments
  RENAME COLUMN "invoiceId" TO invoice_id;

ALTER TABLE finance_payments
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE finance_payments
  RENAME COLUMN "paymentDate" TO payment_date;

ALTER TABLE finance_payments
  RENAME COLUMN "paymentMethod" TO payment_method;

ALTER TABLE finance_payments
  RENAME COLUMN "transactionId" TO transaction_id;

ALTER TABLE finance_payments
  RENAME COLUMN "processedBy" TO processed_by;

ALTER TABLE finance_payments
  RENAME COLUMN "createdAt" TO created_at;

ALTER TABLE finance_payments
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Finance payments table fixed'
\echo ''

-- Fix case_finances table
\echo 'Fixing case_finances table...'
ALTER TABLE case_finances
  RENAME COLUMN "caseId" TO case_id;

ALTER TABLE case_finances
  RENAME COLUMN "totalBilled" TO total_billed;

ALTER TABLE case_finances
  RENAME COLUMN "totalPaid" TO total_paid;

ALTER TABLE case_finances
  RENAME COLUMN "totalOutstanding" TO total_outstanding;

ALTER TABLE case_finances
  RENAME COLUMN "totalExpenses" TO total_expenses;

ALTER TABLE case_finances
  RENAME COLUMN "totalHours" TO total_hours;

ALTER TABLE case_finances
  RENAME COLUMN "lastInvoiceDate" TO last_invoice_date;

ALTER TABLE case_finances
  RENAME COLUMN "lastPaymentDate" TO last_payment_date;

ALTER TABLE case_finances
  RENAME COLUMN "updatedAt" TO updated_at;

\echo '✓ Case finances table fixed'
\echo ''

\echo '✅ ALL COLUMN NAMES FIXED SUCCESSFULLY!'
\echo ''
\echo 'The following tables have been corrected:'
\echo '  - events'
\echo '  - event_participants'
\echo '  - event_reminders'
\echo '  - tasks'
\echo '  - task_checklist_items'
\echo '  - task_history'
\echo '  - notification_templates'
\echo '  - notification_logs'
\echo '  - agreements'
\echo '  - service_items'
\echo '  - finance_invoices'
\echo '  - finance_payments'
\echo '  - case_finances'
\echo ''
