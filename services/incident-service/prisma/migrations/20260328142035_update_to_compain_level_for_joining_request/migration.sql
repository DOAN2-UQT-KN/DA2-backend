/*
  Warnings:

  - The `status` column on the `background_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `report_result_id` on the `report_media_files` table. All the data in the column will be lost.
  - The `status` column on the `report_results` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `report_joining_request` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_tasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_assignments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `ai_analysis_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `compaign_managers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ai_analysis_logs" DROP CONSTRAINT "ai_analysis_logs_report_id_fkey";

-- DropForeignKey
ALTER TABLE "report_joining_request" DROP CONSTRAINT "report_joining_request_report_id_fkey";

-- DropForeignKey
ALTER TABLE "report_media_files" DROP CONSTRAINT "report_media_files_report_result_id_fkey";

-- DropForeignKey
ALTER TABLE "report_tasks" DROP CONSTRAINT "report_tasks_report_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_report_task_id_fkey";

-- DropIndex
DROP INDEX "report_media_files_report_result_id_idx";

-- AlterTable
ALTER TABLE "ai_analysis_logs" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "background_jobs" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "updated_by" UUID,
DROP COLUMN "status",
ADD COLUMN     "status" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "compaign_managers" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "report_issues" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "report_media_files" DROP COLUMN "report_result_id",
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "reportResultId" UUID,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "report_results" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "updated_by" UUID,
DROP COLUMN "status",
ADD COLUMN     "status" INTEGER NOT NULL DEFAULT 6;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "updated_by" UUID,
DROP COLUMN "status",
ADD COLUMN     "status" INTEGER DEFAULT 12;

-- DropTable
DROP TABLE "report_joining_request";

-- DropTable
DROP TABLE "report_tasks";

-- DropTable
DROP TABLE "task_assignments";

-- CreateTable
CREATE TABLE "compaign_tasks" (
    "id" UUID NOT NULL,
    "compaign_id" UUID,
    "title" VARCHAR(200),
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 21,
    "scheduled_time" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compaign_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compaign_task_assignments" (
    "id" UUID NOT NULL,
    "compaign_task_id" UUID,
    "volunteer_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compaign_task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compaign_joining_requests" (
    "id" UUID NOT NULL,
    "compaign_id" UUID,
    "volunteer_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 12,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compaign_joining_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compaign_tasks_compaign_id_idx" ON "compaign_tasks"("compaign_id");

-- CreateIndex
CREATE INDEX "compaign_tasks_status_idx" ON "compaign_tasks"("status");

-- CreateIndex
CREATE INDEX "compaign_task_assignments_compaign_task_id_idx" ON "compaign_task_assignments"("compaign_task_id");

-- CreateIndex
CREATE INDEX "compaign_task_assignments_volunteer_id_idx" ON "compaign_task_assignments"("volunteer_id");

-- CreateIndex
CREATE INDEX "compaign_joining_requests_compaign_id_idx" ON "compaign_joining_requests"("compaign_id");

-- CreateIndex
CREATE INDEX "compaign_joining_requests_volunteer_id_idx" ON "compaign_joining_requests"("volunteer_id");

-- CreateIndex
CREATE INDEX "compaign_joining_requests_status_idx" ON "compaign_joining_requests"("status");

-- CreateIndex
CREATE INDEX "background_jobs_job_type_status_run_after_idx" ON "background_jobs"("job_type", "status", "run_after");

-- CreateIndex
CREATE INDEX "background_jobs_status_run_after_idx" ON "background_jobs"("status", "run_after");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- AddForeignKey
ALTER TABLE "report_media_files" ADD CONSTRAINT "report_media_files_reportResultId_fkey" FOREIGN KEY ("reportResultId") REFERENCES "report_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compaign_tasks" ADD CONSTRAINT "compaign_tasks_compaign_id_fkey" FOREIGN KEY ("compaign_id") REFERENCES "compaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compaign_task_assignments" ADD CONSTRAINT "compaign_task_assignments_compaign_task_id_fkey" FOREIGN KEY ("compaign_task_id") REFERENCES "compaign_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compaign_joining_requests" ADD CONSTRAINT "compaign_joining_requests_compaign_id_fkey" FOREIGN KEY ("compaign_id") REFERENCES "compaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "ai_analysis_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
