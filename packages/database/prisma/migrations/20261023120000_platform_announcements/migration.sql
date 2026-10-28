CREATE TYPE "PlatformAnnouncementStatus" AS ENUM ('draft', 'published', 'cancelled');
CREATE TYPE "PlatformAnnouncementCategory" AS ENUM ('general', 'maintenance', 'deployment', 'incident');
CREATE TYPE "PlatformAnnouncementSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "PlatformAnnouncementAudience" AS ENUM ('all_tenants', 'selected_tenants');

CREATE TABLE "platform_announcements" (
  "id" UUID NOT NULL,
  "status" "PlatformAnnouncementStatus" NOT NULL DEFAULT 'draft',
  "category" "PlatformAnnouncementCategory" NOT NULL DEFAULT 'general',
  "severity" "PlatformAnnouncementSeverity" NOT NULL DEFAULT 'info',
  "audience" "PlatformAnnouncementAudience" NOT NULL DEFAULT 'all_tenants',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "link_url" TEXT,
  "link_label" TEXT,
  "starts_at" TIMESTAMPTZ(6),
  "ends_at" TIMESTAMPTZ(6),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "platform_announcement_targets" (
  "announcement_id" UUID NOT NULL, "tenant_id" UUID NOT NULL,
  CONSTRAINT "platform_announcement_targets_pkey" PRIMARY KEY ("announcement_id", "tenant_id")
);
CREATE TABLE "platform_announcement_dismissals" (
  "announcement_id" UUID NOT NULL, "user_id" UUID NOT NULL, "revision" INTEGER NOT NULL,
  "dismissed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_announcement_dismissals_pkey" PRIMARY KEY ("announcement_id", "user_id", "revision")
);
CREATE TABLE "platform_announcement_events" (
  "id" UUID NOT NULL, "announcement_id" UUID NOT NULL, "actor_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL, "revision" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_announcement_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_announcements_status_starts_at_ends_at_idx" ON "platform_announcements"("status", "starts_at", "ends_at");
CREATE INDEX "platform_announcement_targets_tenant_id_idx" ON "platform_announcement_targets"("tenant_id");
CREATE INDEX "platform_announcement_dismissals_user_id_idx" ON "platform_announcement_dismissals"("user_id");
CREATE INDEX "platform_announcement_events_announcement_id_created_at_idx" ON "platform_announcement_events"("announcement_id", "created_at");
ALTER TABLE "platform_announcements" ADD CONSTRAINT "platform_announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_announcement_targets" ADD CONSTRAINT "platform_announcement_targets_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_announcement_targets" ADD CONSTRAINT "platform_announcement_targets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_announcement_dismissals" ADD CONSTRAINT "platform_announcement_dismissals_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_announcement_dismissals" ADD CONSTRAINT "platform_announcement_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_announcement_events" ADD CONSTRAINT "platform_announcement_events_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_announcement_events" ADD CONSTRAINT "platform_announcement_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
