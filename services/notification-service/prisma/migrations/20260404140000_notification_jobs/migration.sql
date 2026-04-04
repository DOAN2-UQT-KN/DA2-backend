-- CreateTable
CREATE TABLE "notification_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 12,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_jobs_job_type_status_run_after_idx" ON "notification_jobs"("job_type", "status", "run_after");

-- CreateIndex
CREATE INDEX "notification_jobs_status_run_after_idx" ON "notification_jobs"("status", "run_after");
