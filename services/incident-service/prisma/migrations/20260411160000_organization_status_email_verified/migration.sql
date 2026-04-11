-- Replace is_verify / website_url with status + is_email_verified.
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "website_url";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "is_verify";

ALTER TABLE "organizations" ADD COLUMN "is_email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "status" INTEGER NOT NULL DEFAULT 9;
