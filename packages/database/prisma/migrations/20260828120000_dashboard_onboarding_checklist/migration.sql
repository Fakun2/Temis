CREATE TYPE "TenantOnboardingChecklistStatus" AS ENUM ('pending', 'completed', 'skipped');

ALTER TABLE "tenant_membership_settings"
ADD COLUMN "browser_notifications" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "tenant_onboarding_checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "tenant_membership_id" UUID NOT NULL,
  "step" TEXT NOT NULL,
  "status" "TenantOnboardingChecklistStatus" NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMPTZ(6),
  "skipped_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_onboarding_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_onboarding_checklist_items_tenant_id_tenant_members_key"
ON "tenant_onboarding_checklist_items"("tenant_id", "tenant_membership_id", "step");

CREATE INDEX "tenant_onboarding_checklist_items_tenant_id_tenant_members_idx"
ON "tenant_onboarding_checklist_items"("tenant_id", "tenant_membership_id");

CREATE INDEX "tenant_onboarding_checklist_items_tenant_id_status_idx"
ON "tenant_onboarding_checklist_items"("tenant_id", "status");

ALTER TABLE "tenant_onboarding_checklist_items"
ADD CONSTRAINT "tenant_onboarding_checklist_items_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_onboarding_checklist_items"
ADD CONSTRAINT "tenant_onboarding_checklist_items_tenant_membership_fkey"
FOREIGN KEY ("tenant_id", "tenant_membership_id")
REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
