ALTER TABLE "users"
  ADD COLUMN "avatar_url" TEXT;

ALTER TABLE "tenant_settings"
  ADD COLUMN "account_plan" TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN "account_plan_status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "monthly_token_limit" INTEGER NOT NULL DEFAULT 100000;

CREATE TABLE "tenant_membership_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_membership_id" UUID NOT NULL,
  "in_app_reminders" BOOLEAN NOT NULL DEFAULT true,
  "email_reminders" BOOLEAN NOT NULL DEFAULT false,
  "daily_digest" BOOLEAN NOT NULL DEFAULT false,
  "reminder_lead_time" INTEGER NOT NULL DEFAULT 24,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "tenant_membership_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_membership_settings_tenant_membership_id_key"
  ON "tenant_membership_settings"("tenant_membership_id");

ALTER TABLE "tenant_membership_settings"
  ADD CONSTRAINT "tenant_membership_settings_tenant_membership_id_fkey"
  FOREIGN KEY ("tenant_membership_id")
  REFERENCES "tenant_memberships"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
