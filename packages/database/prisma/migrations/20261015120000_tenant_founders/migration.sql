ALTER TABLE "tenants"
  ADD COLUMN "created_by_user_id" UUID,
  ADD COLUMN "created_by_membership_id" UUID;

WITH ranked_owners AS (
  SELECT
    tm."tenant_id",
    tm."id" AS "membership_id",
    tm."user_id",
    ROW_NUMBER() OVER (
      PARTITION BY tm."tenant_id"
      ORDER BY tm."created_at" ASC, tm."id" ASC
    ) AS "owner_rank"
  FROM "tenant_memberships" tm
  INNER JOIN "roles" r ON r."id" = tm."role_id"
  WHERE r."code" = 'owner'
)
UPDATE "tenants" t
SET
  "created_by_user_id" = owners."user_id",
  "created_by_membership_id" = owners."membership_id"
FROM ranked_owners owners
WHERE owners."tenant_id" = t."id"
  AND owners."owner_rank" = 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "tenants"
    WHERE "created_by_user_id" IS NULL OR "created_by_membership_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'No se pudo asignar un owner fundador a todos los tenants.';
  END IF;
END $$;

ALTER TABLE "tenants"
  ALTER COLUMN "created_by_user_id" SET NOT NULL,
  ALTER COLUMN "created_by_membership_id" SET NOT NULL;

CREATE UNIQUE INDEX "tenants_created_by_membership_id_key"
  ON "tenants"("created_by_membership_id");

CREATE UNIQUE INDEX "tenants_id_created_by_membership_id_created_by_user_id_key"
  ON "tenants"("id", "created_by_membership_id", "created_by_user_id");

CREATE UNIQUE INDEX "tenant_memberships_tenant_id_id_user_id_key"
  ON "tenant_memberships"("tenant_id", "id", "user_id");

CREATE INDEX "tenants_created_by_user_id_status_idx"
  ON "tenants"("created_by_user_id", "status");

ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tenants_id_created_by_membership_id_created_by_user_id_fkey"
  FOREIGN KEY ("id", "created_by_membership_id", "created_by_user_id") REFERENCES "tenant_memberships"("tenant_id", "id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
