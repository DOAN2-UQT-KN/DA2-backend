-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'WEBSITE');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM (
  'CAMPAIGN_DONE',
  'REPORT_STATUS',
  'REPORT_READY',
  'TASK_ASSIGNED',
  'VOLUNTEER_REQUEST',
  'VOLUNTEER_APPROVED',
  'GENERIC'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "type" "NotificationType" NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "emailTo" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_type_createdAt_idx" ON "notifications"("userId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt" DESC);
