-- Normalize manager table to campaign-level managers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'report_managers'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'compaign_managers'
  ) THEN
    ALTER TABLE "report_managers" RENAME TO "compaign_managers";
  END IF;
END $$;

-- Drop old report-based constraints/indexes if present
ALTER TABLE "compaign_managers" DROP CONSTRAINT IF EXISTS "report_managers_report_id_fkey";
ALTER TABLE "compaign_managers" DROP CONSTRAINT IF EXISTS "compaign_managers_report_id_fkey";
ALTER TABLE "compaign_managers" DROP CONSTRAINT IF EXISTS "report_managers_pkey";
ALTER TABLE "compaign_managers" DROP CONSTRAINT IF EXISTS "compaign_managers_pkey";
DROP INDEX IF EXISTS "report_managers_user_id_idx";
DROP INDEX IF EXISTS "compaign_managers_user_id_idx";
DROP INDEX IF EXISTS "compaign_managers_report_id_idx";

-- Rename report_id column to compaign_id if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'compaign_managers'
      AND column_name = 'report_id'
  ) THEN
    ALTER TABLE "compaign_managers" RENAME COLUMN "report_id" TO "compaign_id";
  END IF;
END $$;

-- Enforce campaign-level keys and foreign key
ALTER TABLE "compaign_managers"
  ADD CONSTRAINT "compaign_managers_pkey" PRIMARY KEY ("compaign_id", "user_id");

CREATE INDEX "compaign_managers_compaign_id_idx" ON "compaign_managers"("compaign_id");
CREATE INDEX "compaign_managers_user_id_idx" ON "compaign_managers"("user_id");

ALTER TABLE "compaign_managers"
  ADD CONSTRAINT "compaign_managers_compaign_id_fkey"
  FOREIGN KEY ("compaign_id") REFERENCES "compaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
