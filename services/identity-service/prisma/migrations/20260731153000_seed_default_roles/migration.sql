-- Default RBAC roles for sign-up (findRoleByName('USER')) and admin flows.
-- id uses column default gen_random_uuid(); skip if name already exists.
INSERT INTO "roles" ("name", "description")
VALUES
  ('ADMIN', 'Administrator with full access'),
  ('USER', 'Standard user with limited access')
ON CONFLICT ("name") DO NOTHING;
