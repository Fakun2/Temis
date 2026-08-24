CREATE TYPE "AsyncOutboxEventStatus" AS ENUM (
  'pending',
  'publishing',
  'published',
  'failed'
);

CREATE TABLE "async_outbox_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID,
  "topic" TEXT NOT NULL,
  "routing_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "AsyncOutboxEventStatus" NOT NULL DEFAULT 'pending',
  "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "async_outbox_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "async_outbox_events"
  ADD CONSTRAINT "async_outbox_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "async_outbox_events_status_available_at_idx"
  ON "async_outbox_events"("status", "available_at");

CREATE INDEX "async_outbox_events_tenant_id_status_idx"
  ON "async_outbox_events"("tenant_id", "status");

CREATE INDEX "async_outbox_events_topic_status_idx"
  ON "async_outbox_events"("topic", "status");

