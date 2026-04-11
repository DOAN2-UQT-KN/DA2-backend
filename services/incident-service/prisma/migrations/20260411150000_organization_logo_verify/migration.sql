-- Organization branding and admin verification (mirrors campaigns/reports).
ALTER TABLE "organizations" ADD COLUMN "logo_url" VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE "organizations" ADD COLUMN "website_url" VARCHAR(2048);
ALTER TABLE "organizations" ADD COLUMN "contact_email" VARCHAR(320);
ALTER TABLE "organizations" ADD COLUMN "is_verify" BOOLEAN NOT NULL DEFAULT false;
