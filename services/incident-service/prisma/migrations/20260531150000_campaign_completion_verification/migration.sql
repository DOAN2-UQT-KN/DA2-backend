-- CreateTable
CREATE TABLE "campaign_completion_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaign_completion_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_completion_verifications_user_id_campaign_id_key" ON "campaign_completion_verifications"("user_id", "campaign_id");

-- CreateIndex
CREATE INDEX "campaign_completion_verifications_campaign_id_idx" ON "campaign_completion_verifications"("campaign_id");

-- AddForeignKey
ALTER TABLE "campaign_completion_verifications" ADD CONSTRAINT "campaign_completion_verifications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
