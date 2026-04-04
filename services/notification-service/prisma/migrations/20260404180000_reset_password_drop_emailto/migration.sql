-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'RESET_PASSWORD';

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "emailTo";
