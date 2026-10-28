ALTER TABLE "platform_announcements" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
CREATE INDEX "platform_announcements_channel_deleted_at_created_at_id_idx" ON "platform_announcements"("channel", "deleted_at", "created_at", "id");
ALTER TABLE "platform_announcements" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3);
