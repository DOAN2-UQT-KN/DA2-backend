-- DropColumn (preferred_language was added briefly; UI language uses client i18n config)
ALTER TABLE "users" DROP COLUMN IF EXISTS "preferred_language";
