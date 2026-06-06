CREATE TYPE "GiftRedemptionStatus" AS ENUM ('PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

ALTER TABLE "gift_redemptions"
ADD COLUMN "phone_number" VARCHAR(32) NOT NULL DEFAULT '',
ADD COLUMN "pickup_location" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" "GiftRedemptionStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN "status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "cancelled_at" TIMESTAMP(3);

CREATE INDEX "gift_redemptions_status_created_at_idx" ON "gift_redemptions"("status", "created_at");
