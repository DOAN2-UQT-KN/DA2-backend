-- Optional admin ban reason on reports.
-- Rollback: ALTER TABLE "reports" DROP COLUMN "reject_reason";

ALTER TABLE "reports" ADD COLUMN "reject_reason" TEXT;
