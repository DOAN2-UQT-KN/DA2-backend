-- CreateTable
CREATE TABLE "difficulties" (
    "id" UUID NOT NULL,
    "level" INTEGER NOT NULL UNIQUE,
    "name" VARCHAR(64) NOT NULL,
    "max_volunteers" INTEGER,
    "green_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "difficulties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "difficulties_deleted_at_idx" ON "difficulties"("deleted_at");
