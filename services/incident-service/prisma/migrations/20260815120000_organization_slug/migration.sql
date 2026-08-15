-- Add unique organization.slug and backfill existing rows from name.
-- Slugify mirrors @da2/constants slugifyOrganizationName (Vietnamese diacritics, lowercase, hyphenated).

ALTER TABLE "organizations" ADD COLUMN "slug" VARCHAR(220);

CREATE OR REPLACE FUNCTION tmp_organization_slugify(src text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      trim(both '-' FROM
        regexp_replace(
          regexp_replace(
            translate(
              lower(coalesce(src, '')),
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        )
      ),
      ''
    ),
    'organization'
  );
$$;

WITH ranked AS (
  SELECT
    id,
    tmp_organization_slugify(name) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY tmp_organization_slugify(name)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM "organizations"
)
UPDATE "organizations" AS o
SET "slug" = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || r.rn::text
END
FROM ranked r
WHERE o.id = r.id;

ALTER TABLE "organizations" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

DROP FUNCTION tmp_organization_slugify(text);
