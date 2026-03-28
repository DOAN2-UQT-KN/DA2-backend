-- CreateTable
CREATE TABLE IF NOT EXISTS "media" (
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

-- Add new media_id column to report_media_files
ALTER TABLE "report_media_files"
ADD COLUMN IF NOT EXISTS "media_id" UUID;

ALTER TABLE "report_media_files"
ALTER COLUMN "media_id" SET NOT NULL;

ALTER TABLE "report_media_files"
DROP COLUMN IF EXISTS "file_url";

-- Add new AI analysis linkage columns
ALTER TABLE "ai_analysis_logs"
ADD COLUMN IF NOT EXISTS "report_media_file_id" UUID,
ADD COLUMN IF NOT EXISTS "media_id" UUID,
ADD COLUMN IF NOT EXISTS "detections" INTEGER;

-- Keep report_id required for new writes
ALTER TABLE "ai_analysis_logs"
ALTER COLUMN "report_id" SET NOT NULL;

-- Drop old AI payload columns now replaced by media linkage
ALTER TABLE "ai_analysis_logs"
DROP COLUMN IF EXISTS "detected_waste_type",
DROP COLUMN IF EXISTS "confidence",
DROP COLUMN IF EXISTS "bounding_box";

-- Indexes
CREATE INDEX IF NOT EXISTS "media_type_idx" ON "media"("type");
CREATE INDEX IF NOT EXISTS "media_deleted_at_idx" ON "media"("deleted_at");
CREATE INDEX IF NOT EXISTS "report_media_files_media_id_idx" ON "report_media_files"("media_id");
CREATE INDEX IF NOT EXISTS "ai_analysis_logs_report_media_file_id_idx" ON "ai_analysis_logs"("report_media_file_id");
CREATE INDEX IF NOT EXISTS "ai_analysis_logs_media_id_idx" ON "ai_analysis_logs"("media_id");
