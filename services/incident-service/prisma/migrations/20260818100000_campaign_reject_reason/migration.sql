-- Optional admin ban reason on campaigns.
-- Rollback: ALTER TABLE "campaigns" DROP COLUMN "reject_reason";

ALTER TABLE "campaigns" ADD COLUMN "reject_reason" TEXT;
