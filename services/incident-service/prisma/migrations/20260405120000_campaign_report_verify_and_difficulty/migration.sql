-- AlterTable
ALTER TABLE "reports" ADD COLUMN "is_verify" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "difficulty" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "campaigns" ADD COLUMN "is_verify" BOOLEAN NOT NULL DEFAULT false;
