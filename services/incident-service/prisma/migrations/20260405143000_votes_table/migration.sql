-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "resource_type" VARCHAR(32) NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_resource_type_resource_id_key" ON "votes"("user_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "votes_resource_type_resource_id_idx" ON "votes"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "votes_user_id_idx" ON "votes"("user_id");
