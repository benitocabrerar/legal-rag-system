const { Client } = require('pg');

const fixes = [
  // Events table
  { table: 'events', from: 'meetingLink', to: 'meeting_link' },
  { table: 'events', from: 'startTime', to: 'start_time' },
  { table: 'events', from: 'endTime', to: 'end_time' },
  { table: 'events', from: 'allDay', to: 'all_day' },
  { table: 'events', from: 'isRecurring', to: 'is_recurring' },
  { table: 'events', from: 'recurrenceRule', to: 'recurrence_rule' },
  { table: 'events', from: 'recurrenceEnd', to: 'recurrence_end' },
  { table: 'events', from: 'caseId', to: 'case_id' },
  { table: 'events', from: 'createdBy', to: 'created_by' },
  { table: 'events', from: 'isPrivate', to: 'is_private' },
  { table: 'events', from: 'createdAt', to: 'created_at' },
  { table: 'events', from: 'updatedAt', to: 'updated_at' },

  // Tasks table
  { table: 'tasks', from: 'caseId', to: 'case_id' },
  { table: 'tasks', from: 'assignedTo', to: 'assigned_to' },
  { table: 'tasks', from: 'createdBy', to: 'created_by' },
  { table: 'tasks', from: 'dueDate', to: 'due_date' },
  { table: 'tasks', from: 'startDate', to: 'start_date' },
  { table: 'tasks', from: 'completedAt', to: 'completed_at' },
  { table: 'tasks', from: 'estimatedHours', to: 'estimated_hours' },
  { table: 'tasks', from: 'actualHours', to: 'actual_hours' },
  { table: 'tasks', from: 'isRecurring', to: 'is_recurring' },
  { table: 'tasks', from: 'recurrenceRule', to: 'recurrence_rule' },
  { table: 'tasks', from: 'parentTaskId', to: 'parent_task_id' },
  { table: 'tasks', from: 'dependsOn', to: 'depends_on' },
  { table: 'tasks', from: 'createdAt', to: 'created_at' },
  { table: 'tasks', from: 'updatedAt', to: 'updated_at' },

  // Event participants
  { table: 'event_participants', from: 'eventId', to: 'event_id' },
  { table: 'event_participants', from: 'userId', to: 'user_id' },
  { table: 'event_participants', from: 'responseTime', to: 'response_time' },
  { table: 'event_participants', from: 'createdAt', to: 'created_at' },

  // Event reminders
  { table: 'event_reminders', from: 'eventId', to: 'event_id' },
  { table: 'event_reminders', from: 'minutesBefore', to: 'minutes_before' },
  { table: 'event_reminders', from: 'recipientUserId', to: 'recipient_user_id' },
  { table: 'event_reminders', from: 'recipientEmail', to: 'recipient_email' },
  { table: 'event_reminders', from: 'sentAt', to: 'sent_at' },
  { table: 'event_reminders', from: 'errorMessage', to: 'error_message' },
  { table: 'event_reminders', from: 'createdAt', to: 'created_at' },

  // Task checklist items
  { table: 'task_checklist_items', from: 'taskId', to: 'task_id' },
  { table: 'task_checklist_items', from: 'isCompleted', to: 'is_completed' },
  { table: 'task_checklist_items', from: 'displayOrder', to: 'display_order' },
  { table: 'task_checklist_items', from: 'completedAt', to: 'completed_at' },
  { table: 'task_checklist_items', from: 'completedBy', to: 'completed_by' },
  { table: 'task_checklist_items', from: 'createdAt', to: 'created_at' },

  // Task history
  { table: 'task_history', from: 'taskId', to: 'task_id' },
  { table: 'task_history', from: 'userId', to: 'user_id' },

  // Finance tables
  { table: 'finance_invoices', from: 'invoiceNumber', to: 'invoice_number' },
  { table: 'finance_invoices', from: 'caseId', to: 'case_id' },
  { table: 'finance_invoices', from: 'agreementId', to: 'agreement_id' },
  { table: 'finance_invoices', from: 'issueDate', to: 'issue_date' },
  { table: 'finance_invoices', from: 'dueDate', to: 'due_date' },
  { table: 'finance_invoices', from: 'taxRate', to: 'tax_rate' },
  { table: 'finance_invoices', from: 'taxAmount', to: 'tax_amount' },
  { table: 'finance_invoices', from: 'paidAmount', to: 'paid_amount' },
  { table: 'finance_invoices', from: 'balanceDue', to: 'balance_due' },
  { table: 'finance_invoices', from: 'paymentTerms', to: 'payment_terms' },
  { table: 'finance_invoices', from: 'createdAt', to: 'created_at' },
  { table: 'finance_invoices', from: 'updatedAt', to: 'updated_at' },

  { table: 'finance_payments', from: 'invoiceId', to: 'invoice_id' },
  { table: 'finance_payments', from: 'caseId', to: 'case_id' },
  { table: 'finance_payments', from: 'paymentDate', to: 'payment_date' },
  { table: 'finance_payments', from: 'paymentMethod', to: 'payment_method' },
  { table: 'finance_payments', from: 'transactionId', to: 'transaction_id' },
  { table: 'finance_payments', from: 'processedBy', to: 'processed_by' },
  { table: 'finance_payments', from: 'createdAt', to: 'created_at' },
  { table: 'finance_payments', from: 'updatedAt', to: 'updated_at' },
];

async function fixColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected\n');

    let success = 0;
    let skipped = 0;

    for (const fix of fixes) {
      try {
        const sql = `ALTER TABLE ${fix.table} RENAME COLUMN "${fix.from}" TO ${fix.to}`;
        await client.query(sql);
        console.log(`✓ ${fix.table}: ${fix.from} → ${fix.to}`);
        success++;
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log(`⊘ ${fix.table}.${fix.from} already renamed or doesn't exist`);
          skipped++;
        } else {
          console.error(`✗ ${fix.table}.${fix.from}: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Complete: ${success} renamed, ${skipped} skipped\n`);

    // Verify critical columns
    console.log('🔍 Verifying events table...');
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'events' AND column_name IN ('meeting_link', 'created_by')
    `);

    if (result.rows.length === 2) {
      console.log('✅ Events table verified!\n');
    } else {
      console.log(`⚠️  Only found ${result.rows.length}/2 columns\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixColumns()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
