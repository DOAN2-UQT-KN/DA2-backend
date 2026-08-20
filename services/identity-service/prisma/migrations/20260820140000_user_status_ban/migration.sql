-- AlterTable
ALTER TABLE "users" ADD COLUMN "status" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "reject_reason" TEXT;

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");
