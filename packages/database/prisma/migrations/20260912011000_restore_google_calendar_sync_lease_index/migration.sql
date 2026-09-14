-- Restore the lease-recovery lookup index removed by the accidental migration
-- 20260912010605. The worker queries expired leases when recovering syncs.
CREATE INDEX "google_calendar_connections_sync_lease_expires_at_idx"
  ON "google_calendar_connections"("sync_lease_expires_at");
