CREATE TYPE "PlatformAnnouncementChannel" AS ENUM ('banner', 'newsletter');
CREATE TYPE "PlatformNewsletterCategory" AS ENUM ('release', 'bugfix', 'policy', 'performance', 'general');
ALTER TABLE "platform_announcements" ADD COLUMN "channel" "PlatformAnnouncementChannel" NOT NULL DEFAULT 'banner', ADD COLUMN "newsletter_category" "PlatformNewsletterCategory", ADD COLUMN "excerpt" TEXT, ADD COLUMN "content" JSONB;
CREATE INDEX "platform_announcements_channel_status_starts_at_idx" ON "platform_announcements"("channel", "status", "starts_at");
CREATE TABLE "platform_announcement_reads" (
  "announcement_id" UUID NOT NULL, "user_id" UUID NOT NULL, "revision" INTEGER NOT NULL,
  "first_viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_announcement_reads_pkey" PRIMARY KEY ("announcement_id", "user_id", "revision"),
  CONSTRAINT "platform_announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_announcement_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "platform_announcement_reads_user_id_idx" ON "platform_announcement_reads"("user_id");
CREATE TABLE "platform_announcement_assets" (
  "id" UUID NOT NULL, "announcement_id" UUID NOT NULL, "storage_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL, "size" INTEGER NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_announcement_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_announcement_assets_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "platform_announcement_assets_storage_key_key" ON "platform_announcement_assets"("storage_key");
CREATE INDEX "platform_announcement_assets_announcement_id_idx" ON "platform_announcement_assets"("announcement_id");
