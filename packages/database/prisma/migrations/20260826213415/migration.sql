-- AlterTable
ALTER TABLE "tenant_membership_settings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_identities" ALTER COLUMN "id" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "notification_reminder_recipients" RENAME CONSTRAINT "notification_reminder_recipients_tenant_id_recipient_membership" TO "notification_reminder_recipients_tenant_id_recipient_membe_fkey";
