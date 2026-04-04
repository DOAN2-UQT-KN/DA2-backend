-- Drop scheduling column; retries use SQS visibility timeout instead.
DROP INDEX IF EXISTS "notification_jobs_job_type_status_run_after_idx";
DROP INDEX IF EXISTS "notification_jobs_status_run_after_idx";

ALTER TABLE "notification_jobs" DROP COLUMN IF EXISTS "run_after";

CREATE INDEX IF NOT EXISTS "notification_jobs_job_type_status_idx" ON "notification_jobs"("job_type", "status");
CREATE INDEX IF NOT EXISTS "notification_jobs_status_idx" ON "notification_jobs"("status");
