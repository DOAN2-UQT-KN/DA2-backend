-- AlterTable: add campaign_id (nullable for backfill)
ALTER TABLE "campaign_results" ADD COLUMN "campaign_id" UUID;

-- Backfill from parent submission
UPDATE "campaign_results" AS cr
SET "campaign_id" = cs."campaign_id"
FROM "campaign_submissions" AS cs
WHERE cr."campaign_submission_id" = cs."id";

-- Allow draft results without a submission yet
ALTER TABLE "campaign_results" ALTER COLUMN "campaign_submission_id" DROP NOT NULL;

-- Require campaign on every result
ALTER TABLE "campaign_results" ALTER COLUMN "campaign_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "campaign_results_campaign_id_idx" ON "campaign_results"("campaign_id");

-- AddForeignKey
ALTER TABLE "campaign_results" ADD CONSTRAINT "campaign_results_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
