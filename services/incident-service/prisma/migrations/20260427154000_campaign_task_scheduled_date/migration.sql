-- AlterTable
ALTER TABLE "campaign_tasks"
ADD COLUMN "scheduled_date" TIMESTAMP(3),
ALTER COLUMN "scheduled_time" TYPE VARCHAR(50)
USING TO_CHAR("scheduled_time", 'HH24:MI:SS');
