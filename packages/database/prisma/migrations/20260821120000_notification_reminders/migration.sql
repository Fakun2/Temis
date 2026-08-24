-- Persistent in-app notification reminders with expanded recipients.

CREATE TYPE "NotificationReminderResourceType" AS ENUM (
  'case_task',
  'case_expense',
  'case_hearing',
  'meeting'
);

CREATE TYPE "NotificationRecipientMode" AS ENUM (
  'self',
  'tenant',
  'practice_area',
  'members'
);

CREATE TYPE "NotificationReminderStatus" AS ENUM (
  'pending',
  'processing',
  'delivered',
  'cancelled',
  'failed'
);

CREATE TYPE "NotificationRecipientStatus" AS ENUM (
  'pending',
  'delivered',
  'read'
);

CREATE TABLE "notification_reminders" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "resource_type" "NotificationReminderResourceType" NOT NULL,
  "resource_id" UUID NOT NULL,
  "recipient_mode" "NotificationRecipientMode" NOT NULL,
  "practice_area_id" UUID,
  "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "status" "NotificationReminderStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_run_at" TIMESTAMPTZ(6) NOT NULL,
  "last_error" TEXT,
  "created_by_membership_id" UUID,
  "delivered_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "notification_reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_reminder_recipients" (
  "id" UUID NOT NULL,
  "reminder_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "recipient_membership_id" UUID NOT NULL,
  "status" "NotificationRecipientStatus" NOT NULL DEFAULT 'pending',
  "delivered_at" TIMESTAMPTZ(6),
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "notification_reminder_recipients_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_reminders"
  ADD CONSTRAINT "notification_reminders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_reminders"
  ADD CONSTRAINT "notification_reminders_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "cases"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_reminder_recipients"
  ADD CONSTRAINT "notification_reminder_recipients_reminder_id_fkey"
  FOREIGN KEY ("reminder_id") REFERENCES "notification_reminders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_reminder_recipients"
  ADD CONSTRAINT "notification_reminder_recipients_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_reminder_recipients"
  ADD CONSTRAINT "notification_reminder_recipients_recipient_membership_id_fkey"
  FOREIGN KEY ("recipient_membership_id") REFERENCES "tenant_memberships"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_reminders_tenant_id_resource_type_resource_id_key"
  ON "notification_reminders"("tenant_id", "resource_type", "resource_id");

CREATE INDEX "notification_reminders_status_next_run_at_idx"
  ON "notification_reminders"("status", "next_run_at");

CREATE INDEX "notification_reminders_tenant_id_status_idx"
  ON "notification_reminders"("tenant_id", "status");

CREATE INDEX "notification_reminders_tenant_id_case_id_idx"
  ON "notification_reminders"("tenant_id", "case_id");

CREATE INDEX "notification_reminders_tenant_id_resource_type_resource_id_idx"
  ON "notification_reminders"("tenant_id", "resource_type", "resource_id");

CREATE INDEX "notification_reminders_tenant_id_practice_area_id_idx"
  ON "notification_reminders"("tenant_id", "practice_area_id");

CREATE UNIQUE INDEX "notification_reminder_recipients_reminder_id_recipient_memb_key"
  ON "notification_reminder_recipients"("reminder_id", "recipient_membership_id");

CREATE INDEX "notification_reminder_recipients_tenant_id_recipient_member_idx"
  ON "notification_reminder_recipients"("tenant_id", "recipient_membership_id", "read_at");

CREATE INDEX "notification_reminder_recipients_tenant_id_status_idx"
  ON "notification_reminder_recipients"("tenant_id", "status");

CREATE INDEX "notification_reminder_recipients_tenant_id_reminder_id_idx"
  ON "notification_reminder_recipients"("tenant_id", "reminder_id");

INSERT INTO "notification_reminders" (
  "tenant_id",
  "case_id",
  "resource_type",
  "resource_id",
  "recipient_mode",
  "scheduled_at",
  "title",
  "body",
  "status",
  "next_run_at"
)
SELECT
  ce."tenant_id",
  ce."case_id",
  'case_expense'::"NotificationReminderResourceType",
  ce."id",
  'tenant'::"NotificationRecipientMode",
  ce."alert_at",
  'Pago: ' || ce."concept",
  'Recordatorio de gasto programado antes o cerca de su fecha de pago.',
  CASE
    WHEN ce."alert_at" < CURRENT_TIMESTAMP THEN 'pending'::"NotificationReminderStatus"
    ELSE 'pending'::"NotificationReminderStatus"
  END,
  ce."alert_at"
FROM "case_expenses" ce
WHERE ce."alert_enabled" = true
  AND ce."alert_at" IS NOT NULL
ON CONFLICT ("tenant_id", "resource_type", "resource_id") DO NOTHING;

INSERT INTO "notification_reminder_recipients" (
  "reminder_id",
  "tenant_id",
  "recipient_membership_id"
)
SELECT
  nr."id",
  nr."tenant_id",
  tm."id"
FROM "notification_reminders" nr
INNER JOIN "tenant_memberships" tm
  ON tm."tenant_id" = nr."tenant_id"
 AND tm."status" = 'active'
WHERE nr."resource_type" = 'case_expense'
ON CONFLICT ("reminder_id", "recipient_membership_id") DO NOTHING;
