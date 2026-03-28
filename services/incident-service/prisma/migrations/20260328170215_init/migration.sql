-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "campaign_id" UUID,
    "user_id" UUID,
    "title" VARCHAR(200),
    "description" TEXT,
    "waste_type" VARCHAR(100),
    "severity_level" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" INTEGER DEFAULT 12,
    "ai_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_results" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "submitted_by_manager_id" UUID NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 6,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_media_files" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "media_id" UUID NOT NULL,
    "stage" VARCHAR(20),
    "uploaded_by" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "reportResultId" UUID,

    CONSTRAINT "report_media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_tasks" (
    "id" UUID NOT NULL,
    "campaign_id" UUID,
    "title" VARCHAR(200),
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 21,
    "scheduled_time" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaign_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_task_assignments" (
    "id" UUID NOT NULL,
    "campaign_task_id" UUID,
    "volunteer_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaign_task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_joining_requests" (
    "id" UUID NOT NULL,
    "campaign_id" UUID,
    "volunteer_id" UUID,
    "status" INTEGER NOT NULL DEFAULT 12,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaign_joining_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_issues" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "reporter_id" UUID,
    "issue_type" VARCHAR(50),
    "description" TEXT,
    "media_file_url" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_managers" (
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaign_managers_pkey" PRIMARY KEY ("campaign_id","user_id")
);

-- CreateTable
CREATE TABLE "ai_analysis_logs" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "report_media_file_id" UUID,
    "media_id" UUID,
    "detections" INTEGER,
    "created_by" UUID,
    "updated_by" UUID,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" UUID NOT NULL,
    "job_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 12,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_campaign_id_idx" ON "reports"("campaign_id");

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_deleted_at_idx" ON "reports"("deleted_at");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_created_by_idx" ON "campaigns"("created_by");

-- CreateIndex
CREATE INDEX "campaigns_deleted_at_idx" ON "campaigns"("deleted_at");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_deleted_at_idx" ON "media"("deleted_at");

-- CreateIndex
CREATE INDEX "report_results_report_id_idx" ON "report_results"("report_id");

-- CreateIndex
CREATE INDEX "report_results_submitted_by_manager_id_idx" ON "report_results"("submitted_by_manager_id");

-- CreateIndex
CREATE INDEX "report_media_files_report_id_idx" ON "report_media_files"("report_id");

-- CreateIndex
CREATE INDEX "report_media_files_media_id_idx" ON "report_media_files"("media_id");

-- CreateIndex
CREATE INDEX "campaign_tasks_campaign_id_idx" ON "campaign_tasks"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_tasks_status_idx" ON "campaign_tasks"("status");

-- CreateIndex
CREATE INDEX "campaign_task_assignments_campaign_task_id_idx" ON "campaign_task_assignments"("campaign_task_id");

-- CreateIndex
CREATE INDEX "campaign_task_assignments_volunteer_id_idx" ON "campaign_task_assignments"("volunteer_id");

-- CreateIndex
CREATE INDEX "campaign_joining_requests_campaign_id_idx" ON "campaign_joining_requests"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_joining_requests_volunteer_id_idx" ON "campaign_joining_requests"("volunteer_id");

-- CreateIndex
CREATE INDEX "campaign_joining_requests_status_idx" ON "campaign_joining_requests"("status");

-- CreateIndex
CREATE INDEX "report_issues_report_id_idx" ON "report_issues"("report_id");

-- CreateIndex
CREATE INDEX "report_issues_reporter_id_idx" ON "report_issues"("reporter_id");

-- CreateIndex
CREATE INDEX "campaign_managers_campaign_id_idx" ON "campaign_managers"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_managers_user_id_idx" ON "campaign_managers"("user_id");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_report_id_idx" ON "ai_analysis_logs"("report_id");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_report_media_file_id_idx" ON "ai_analysis_logs"("report_media_file_id");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_media_id_idx" ON "ai_analysis_logs"("media_id");

-- CreateIndex
CREATE INDEX "background_jobs_job_type_status_run_after_idx" ON "background_jobs"("job_type", "status", "run_after");

-- CreateIndex
CREATE INDEX "background_jobs_status_run_after_idx" ON "background_jobs"("status", "run_after");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_results" ADD CONSTRAINT "report_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_media_files" ADD CONSTRAINT "report_media_files_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_media_files" ADD CONSTRAINT "report_media_files_reportResultId_fkey" FOREIGN KEY ("reportResultId") REFERENCES "report_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_tasks" ADD CONSTRAINT "campaign_tasks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_task_assignments" ADD CONSTRAINT "campaign_task_assignments_campaign_task_id_fkey" FOREIGN KEY ("campaign_task_id") REFERENCES "campaign_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_joining_requests" ADD CONSTRAINT "campaign_joining_requests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_issues" ADD CONSTRAINT "report_issues_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_managers" ADD CONSTRAINT "campaign_managers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "ai_analysis_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
