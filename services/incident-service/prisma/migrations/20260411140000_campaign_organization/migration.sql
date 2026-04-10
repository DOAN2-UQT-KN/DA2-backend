-- Add organization to campaigns. Creation is restricted to organization owners in application code.
ALTER TABLE "campaigns" ADD COLUMN "organization_id" UUID;

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "campaigns_organization_id_idx" ON "campaigns"("organization_id");

-- Backfill legacy rows to the earliest active organization when one exists.
UPDATE "campaigns" AS c
SET "organization_id" = sub."id"
FROM (
    SELECT o."id"
    FROM "organizations" o
    WHERE o."deleted_at" IS NULL
    ORDER BY o."created_at" ASC
    LIMIT 1
) AS sub
WHERE c."organization_id" IS NULL
  AND EXISTS (
      SELECT 1 FROM "organizations" o2 WHERE o2."deleted_at" IS NULL LIMIT 1
  );

DO $$
DECLARE
  missing int;
BEGIN
  SELECT COUNT(*)::int INTO missing FROM "campaigns" WHERE "organization_id" IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION 'campaigns.organization_id: % row(s) still NULL. Create at least one organization and assign organization_id on those campaigns, then re-apply this migration step.', missing;
  END IF;
END $$;

ALTER TABLE "campaigns" ALTER COLUMN "organization_id" SET NOT NULL;
