/*
  Warnings:

  - You are about to drop the column `is_verify` on the `campaigns` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "is_verify",
ADD COLUMN     "detail_address" VARCHAR(255),
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "radius_km" DOUBLE PRECISION,
ADD COLUMN     "start_date" TIMESTAMP(3);
