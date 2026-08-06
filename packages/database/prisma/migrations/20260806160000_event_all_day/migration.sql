-- AlterTable
ALTER TABLE "events" ADD COLUMN "all_day" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "event_versions" ADD COLUMN "all_day" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: UTC midnight timestamps were used as date-only placeholders and
-- incorrectly surface as 01:00/02:00 in local (CET/CEST) admin views.
UPDATE "events"
SET "all_day" = true
WHERE ("start_at" AT TIME ZONE 'UTC')::time = TIME '00:00:00'
  AND (
    "end_at" IS NULL
    OR ("end_at" AT TIME ZONE 'UTC')::time = TIME '00:00:00'
  );

UPDATE "event_versions"
SET "all_day" = true
WHERE ("start_at" AT TIME ZONE 'UTC')::time = TIME '00:00:00'
  AND (
    "end_at" IS NULL
    OR ("end_at" AT TIME ZONE 'UTC')::time = TIME '00:00:00'
  );
