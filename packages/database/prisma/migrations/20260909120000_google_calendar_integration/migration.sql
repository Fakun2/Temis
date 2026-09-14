-- CreateEnum
CREATE TYPE "GoogleCalendarConnectionStatus" AS ENUM ('connected', 'reauthorization_required', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "GoogleCalendarEventResourceType" AS ENUM ('case_task', 'case_hearing');

-- CreateEnum
CREATE TYPE "GoogleCalendarEventLinkStatus" AS ENUM ('active', 'deleted', 'failed');

-- CreateTable
CREATE TABLE "google_calendar_connections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_membership_id" UUID NOT NULL,
    "google_subject" TEXT NOT NULL,
    "google_email" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "calendar_name" TEXT NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT NOT NULL,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "status" "GoogleCalendarConnectionStatus" NOT NULL DEFAULT 'connected',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_calendar_event_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "resource_type" "GoogleCalendarEventResourceType" NOT NULL,
    "resource_id" UUID NOT NULL,
    "google_calendar_id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "google_event_etag" TEXT,
    "last_synced_at" TIMESTAMPTZ(6),
    "status" "GoogleCalendarEventLinkStatus" NOT NULL DEFAULT 'active',
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "google_calendar_event_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_calendar_connections_tenant_id_tenant_membership_id_key" ON "google_calendar_connections"("tenant_id", "tenant_membership_id");
CREATE INDEX "google_calendar_connections_tenant_id_status_idx" ON "google_calendar_connections"("tenant_id", "status");
CREATE INDEX "google_calendar_connections_user_id_idx" ON "google_calendar_connections"("user_id");
CREATE UNIQUE INDEX "google_calendar_event_links_connection_id_resource_type_resource_id_key" ON "google_calendar_event_links"("connection_id", "resource_type", "resource_id");
CREATE UNIQUE INDEX "google_calendar_event_links_google_calendar_id_google_event_id_key" ON "google_calendar_event_links"("google_calendar_id", "google_event_id");
CREATE INDEX "google_calendar_event_links_tenant_id_connection_id_idx" ON "google_calendar_event_links"("tenant_id", "connection_id");
CREATE INDEX "google_calendar_event_links_tenant_id_resource_type_resource_id_idx" ON "google_calendar_event_links"("tenant_id", "resource_type", "resource_id");

ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_tenant_id_tenant_membership_id_fkey" FOREIGN KEY ("tenant_id", "tenant_membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_calendar_event_links" ADD CONSTRAINT "google_calendar_event_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_calendar_event_links" ADD CONSTRAINT "google_calendar_event_links_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "google_calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
