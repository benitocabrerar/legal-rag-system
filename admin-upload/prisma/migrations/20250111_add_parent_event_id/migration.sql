-- Add missing parent_event_id column for recurring events self-reference
ALTER TABLE "events" ADD COLUMN "parent_event_id" TEXT;

-- Add missing attachments column
ALTER TABLE "events" ADD COLUMN "attachments" JSONB;

-- Add foreign key constraint for parent_event_id self-reference
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_fkey"
  FOREIGN KEY ("parent_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for parent_event_id for better query performance
CREATE INDEX "events_parent_event_id_idx" ON "events"("parent_event_id");
