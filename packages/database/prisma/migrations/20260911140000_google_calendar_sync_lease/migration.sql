ALTER TABLE "google_calendar_connections"
  ADD COLUMN "sync_lease_token" TEXT,
  ADD COLUMN "sync_lease_expires_at" TIMESTAMPTZ(6);

CREATE INDEX "google_calendar_connections_sync_lease_expires_at_idx"
  ON "google_calendar_connections"("sync_lease_expires_at");
