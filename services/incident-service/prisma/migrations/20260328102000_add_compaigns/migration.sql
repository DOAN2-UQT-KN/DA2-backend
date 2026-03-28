-- CreateTable
CREATE TABLE "compaigns" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compaigns_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "reports" ADD COLUMN "compaign_id" UUID;

-- CreateIndex
CREATE INDEX "compaigns_status_idx" ON "compaigns"("status");

-- CreateIndex
CREATE INDEX "compaigns_created_by_idx" ON "compaigns"("created_by");

-- CreateIndex
CREATE INDEX "compaigns_deleted_at_idx" ON "compaigns"("deleted_at");

-- CreateIndex
CREATE INDEX "reports_compaign_id_idx" ON "reports"("compaign_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_compaign_id_fkey" FOREIGN KEY ("compaign_id") REFERENCES "compaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
