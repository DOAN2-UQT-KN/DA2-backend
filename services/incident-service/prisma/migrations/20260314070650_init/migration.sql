-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "title" VARCHAR(200),
    "description" TEXT,
    "waste_type" VARCHAR(100),
    "severity_level" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" VARCHAR(50) DEFAULT 'pending',
    "ai_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_results" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "submitted_by_manager_id" UUID NOT NULL,
    "description" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_media_files" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "report_result_id" UUID,
    "file_url" TEXT NOT NULL,
    "stage" VARCHAR(20),
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_tasks" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "title" VARCHAR(200),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "scheduled_time" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" UUID NOT NULL,
    "report_task_id" UUID,
    "volunteer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_joining_request" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "volunteer_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_joining_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_issues" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "reporter_id" UUID,
    "issue_type" VARCHAR(50),
    "description" TEXT,
    "media_file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_managers" (
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_managers_pkey" PRIMARY KEY ("report_id","user_id")
);

-- CreateTable
CREATE TABLE "ai_analysis_logs" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "detected_waste_type" VARCHAR(100),
    "confidence" DOUBLE PRECISION,
    "bounding_box" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_deleted_at_idx" ON "reports"("deleted_at");

-- CreateIndex
CREATE INDEX "report_results_report_id_idx" ON "report_results"("report_id");

-- CreateIndex
CREATE INDEX "report_results_submitted_by_manager_id_idx" ON "report_results"("submitted_by_manager_id");

-- CreateIndex
CREATE INDEX "report_media_files_report_id_idx" ON "report_media_files"("report_id");

-- CreateIndex
CREATE INDEX "report_media_files_report_result_id_idx" ON "report_media_files"("report_result_id");

-- CreateIndex
CREATE INDEX "report_tasks_report_id_idx" ON "report_tasks"("report_id");

-- CreateIndex
CREATE INDEX "report_tasks_status_idx" ON "report_tasks"("status");

-- CreateIndex
CREATE INDEX "task_assignments_report_task_id_idx" ON "task_assignments"("report_task_id");

-- CreateIndex
CREATE INDEX "task_assignments_volunteer_id_idx" ON "task_assignments"("volunteer_id");

-- CreateIndex
CREATE INDEX "report_joining_request_report_id_idx" ON "report_joining_request"("report_id");

-- CreateIndex
CREATE INDEX "report_joining_request_volunteer_id_idx" ON "report_joining_request"("volunteer_id");

-- CreateIndex
CREATE INDEX "report_joining_request_status_idx" ON "report_joining_request"("status");

-- CreateIndex
CREATE INDEX "report_issues_report_id_idx" ON "report_issues"("report_id");

-- CreateIndex
CREATE INDEX "report_issues_reporter_id_idx" ON "report_issues"("reporter_id");

-- CreateIndex
CREATE INDEX "report_managers_user_id_idx" ON "report_managers"("user_id");

-- CreateIndex
CREATE INDEX "ai_analysis_logs_report_id_idx" ON "ai_analysis_logs"("report_id");

-- AddForeignKey
ALTER TABLE "report_results" ADD CONSTRAINT "report_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_media_files" ADD CONSTRAINT "report_media_files_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_media_files" ADD CONSTRAINT "report_media_files_report_result_id_fkey" FOREIGN KEY ("report_result_id") REFERENCES "report_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_tasks" ADD CONSTRAINT "report_tasks_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_report_task_id_fkey" FOREIGN KEY ("report_task_id") REFERENCES "report_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_joining_request" ADD CONSTRAINT "report_joining_request_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_issues" ADD CONSTRAINT "report_issues_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_managers" ADD CONSTRAINT "report_managers_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "ai_analysis_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
