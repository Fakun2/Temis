CREATE TYPE "GoogleCalendarSyncMode" AS ENUM ('global', 'custom');
CREATE TYPE "GoogleCalendarSyncSource" AS ENUM ('all_hearings', 'my_tasks', 'my_area_tasks', 'participating_hearings', 'all_tasks');

ALTER TABLE "google_calendar_connections"
  ADD COLUMN "sync_mode" "GoogleCalendarSyncMode" NOT NULL DEFAULT 'global',
  ADD COLUMN "sync_sources" "GoogleCalendarSyncSource"[] NOT NULL DEFAULT ARRAY[]::"GoogleCalendarSyncSource"[];

CREATE TABLE "case_hearing_participants" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "hearing_id" UUID NOT NULL,
  "tenant_membership_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "case_hearing_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_hearing_participants_hearing_id_tenant_membership_id_key"
  ON "case_hearing_participants"("hearing_id", "tenant_membership_id");
CREATE INDEX "case_hearing_participants_tenant_id_tenant_membership_id_idx"
  ON "case_hearing_participants"("tenant_id", "tenant_membership_id");
CREATE INDEX "case_hearing_participants_tenant_id_hearing_id_idx"
  ON "case_hearing_participants"("tenant_id", "hearing_id");

ALTER TABLE "case_hearing_participants"
  ADD CONSTRAINT "case_hearing_participants_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "case_hearing_participants_hearing_id_fkey"
    FOREIGN KEY ("hearing_id") REFERENCES "case_hearings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "case_hearing_participants_tenant_id_tenant_membership_id_fkey"
    FOREIGN KEY ("tenant_id", "tenant_membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
