ALTER TABLE "cases" ALTER COLUMN "province_id" DROP NOT NULL;
ALTER TABLE "cases" ALTER COLUMN "forum_template_id" DROP NOT NULL;

ALTER TABLE "cases"
  ADD COLUMN "province_text" TEXT,
  ADD COLUMN "jurisdiction_text" TEXT,
  ADD COLUMN "unit_text" TEXT;

CREATE TABLE "case_external_references" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "imported_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_external_references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_external_references_tenant_id_source_external_id_key"
  ON "case_external_references" ("tenant_id", "source", "external_id");

CREATE INDEX "case_external_references_tenant_id_idx"
  ON "case_external_references" ("tenant_id");

CREATE INDEX "case_external_references_tenant_id_case_id_idx"
  ON "case_external_references" ("tenant_id", "case_id");

CREATE INDEX "case_external_references_imported_by_user_id_idx"
  ON "case_external_references" ("imported_by_user_id");

ALTER TABLE "case_external_references"
  ADD CONSTRAINT "case_external_references_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_external_references"
  ADD CONSTRAINT "case_external_references_tenant_id_case_id_fkey"
  FOREIGN KEY ("tenant_id", "case_id") REFERENCES "cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_external_references"
  ADD CONSTRAINT "case_external_references_imported_by_user_id_fkey"
  FOREIGN KEY ("imported_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "code", "resource", "action", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'integrations:sae_import', 'integrations', 'sae_import', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "resource" = EXCLUDED."resource",
    "action" = EXCLUDED."action",
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT gen_random_uuid(), "roles"."id", "permissions"."id", CURRENT_TIMESTAMP
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."code" = 'owner'
  AND "roles"."is_system" = true
  AND "permissions"."code" = 'integrations:sae_import'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
