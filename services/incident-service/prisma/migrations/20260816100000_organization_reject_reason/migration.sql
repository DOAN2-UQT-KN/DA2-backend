-- Optional admin reject reason on organizations.
-- Rollback: ALTER TABLE "organizations" DROP COLUMN "reject_reason";

ALTER TABLE "organizations" ADD COLUMN "reject_reason" TEXT;
