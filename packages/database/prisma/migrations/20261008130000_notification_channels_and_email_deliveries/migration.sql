CREATE TYPE "NotificationEmailDeliveryStatus" AS ENUM (
  'pending', 'processing', 'delivered', 'skipped', 'failed'
);

CREATE TABLE "notification_channel_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "tenant_membership_id" UUID NOT NULL,
  "resource_type" "NotificationReminderResourceType" NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "email_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "notification_channel_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_email_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "reminder_recipient_id" UUID NOT NULL,
  "status" "NotificationEmailDeliveryStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error" TEXT,
  "delivered_at" TIMESTAMPTZ(6),
  "skipped_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "notification_email_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_channel_preferences_tenant_id_tenant_membership_id_resource_type_key"
  ON "notification_channel_preferences"("tenant_id", "tenant_membership_id", "resource_type");
CREATE INDEX "notification_channel_preferences_membership_idx"
  ON "notification_channel_preferences"("tenant_id", "tenant_membership_id");
CREATE UNIQUE INDEX "notification_email_deliveries_tenant_id_reminder_recipient_id_key"
  ON "notification_email_deliveries"("tenant_id", "reminder_recipient_id");
CREATE UNIQUE INDEX "notification_reminder_recipients_tenant_id_id_key"
  ON "notification_reminder_recipients"("tenant_id", "id");
CREATE INDEX "notification_email_deliveries_status_next_run_at_idx"
  ON "notification_email_deliveries"("status", "next_run_at");
CREATE INDEX "notification_email_deliveries_tenant_id_status_idx"
  ON "notification_email_deliveries"("tenant_id", "status");

ALTER TABLE "notification_channel_preferences"
  ADD CONSTRAINT "notification_channel_preferences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "notification_channel_preferences_tenant_id_tenant_membership_id_fkey"
  FOREIGN KEY ("tenant_id", "tenant_membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_email_deliveries"
  ADD CONSTRAINT "notification_email_deliveries_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "notification_email_deliveries_tenant_id_reminder_recipient_id_fkey"
  FOREIGN KEY ("tenant_id", "reminder_recipient_id") REFERENCES "notification_reminder_recipients"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "notification_channel_preferences" (
  "id", "tenant_id", "tenant_membership_id", "resource_type", "in_app_enabled", "email_enabled", "updated_at"
)
SELECT gen_random_uuid(), tm."tenant_id", tm."id", resource_type, true, false, CURRENT_TIMESTAMP
FROM "tenant_memberships" tm
CROSS JOIN unnest(enum_range(NULL::"NotificationReminderResourceType")) AS resource_type
ON CONFLICT ("tenant_id", "tenant_membership_id", "resource_type") DO NOTHING;
