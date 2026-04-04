/*
  Warnings:

  - You are about to drop the column `stage` on the `report_media_files` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "campaign_results" DROP CONSTRAINT "campaign_results_campaign_submission_id_fkey";

-- AlterTable
ALTER TABLE "report_media_files" DROP COLUMN "stage";

-- AddForeignKey
ALTER TABLE "campaign_results" ADD CONSTRAINT "campaign_results_campaign_submission_id_fkey" FOREIGN KEY ("campaign_submission_id") REFERENCES "campaign_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
