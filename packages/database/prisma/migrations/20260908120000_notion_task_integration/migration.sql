-- Allow imported Notion tasks to live without an expediente while keeping manual case-scoped
-- endpoints responsible for requiring a case.
ALTER TABLE "case_tasks" ALTER COLUMN "case_id" DROP NOT NULL;

CREATE TYPE "NotionConnectionStatus" AS ENUM ('connected', 'disconnected', 'error');
CREATE TYPE "NotionSyncJobDirection" AS ENUM ('pull', 'push', 'bidirectional');
CREATE TYPE "NotionSyncJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "NotionTaskSyncState" AS ENUM ('synced', 'pending_push', 'pending_pull', 'conflict');
CREATE TYPE "NotionSyncConflictStatus" AS ENUM ('open', 'resolved');

CREATE TABLE "notion_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "workspace_name" TEXT,
  "workspace_icon" TEXT,
  "bot_id" TEXT,
  "encrypted_access_token" TEXT NOT NULL,
  "encrypted_refresh_token" TEXT,
  "connected_by_membership_id" UUID NOT NULL,
  "status" "NotionConnectionStatus" NOT NULL DEFAULT 'connected',
  "last_sync_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_connections_connected_by_membership_fkey" FOREIGN KEY ("tenant_id", "connected_by_membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "notion_task_board_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "data_source_id" TEXT NOT NULL,
  "data_source_name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sync_interval_minutes" INTEGER NOT NULL DEFAULT 15,
  "property_mapping" JSONB NOT NULL,
  "status_mapping" JSONB NOT NULL,
  "last_pull_at" TIMESTAMPTZ(6),
  "last_push_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_task_board_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_task_board_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_task_board_mappings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "notion_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "notion_task_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "notion_page_id" TEXT NOT NULL,
  "mapping_id" UUID NOT NULL,
  "last_notion_edited_at" TIMESTAMPTZ(6),
  "last_bogapp_updated_at" TIMESTAMPTZ(6),
  "last_synced_hash" TEXT,
  "sync_state" "NotionTaskSyncState" NOT NULL DEFAULT 'synced',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_task_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_task_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_task_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "case_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_task_links_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "notion_task_board_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "notion_sync_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "mapping_id" UUID NOT NULL,
  "direction" "NotionSyncJobDirection" NOT NULL,
  "status" "NotionSyncJobStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_sync_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_sync_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_sync_jobs_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "notion_task_board_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "notion_sync_conflicts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "task_id" UUID,
  "notion_page_id" TEXT,
  "mapping_id" UUID NOT NULL,
  "field_diff" JSONB NOT NULL,
  "status" "NotionSyncConflictStatus" NOT NULL DEFAULT 'open',
  "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_sync_conflicts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_sync_conflicts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_sync_conflicts_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "notion_task_board_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notion_connections_tenant_id_workspace_id_key" ON "notion_connections"("tenant_id", "workspace_id");
CREATE INDEX "notion_connections_tenant_id_status_idx" ON "notion_connections"("tenant_id", "status");
CREATE INDEX "notion_connections_tenant_id_connected_by_membership_id_idx" ON "notion_connections"("tenant_id", "connected_by_membership_id");

CREATE UNIQUE INDEX "notion_task_board_mappings_tenant_id_data_source_id_key" ON "notion_task_board_mappings"("tenant_id", "data_source_id");
CREATE INDEX "notion_task_board_mappings_tenant_id_enabled_last_pull_at_idx" ON "notion_task_board_mappings"("tenant_id", "enabled", "last_pull_at");
CREATE INDEX "notion_task_board_mappings_tenant_id_connection_id_idx" ON "notion_task_board_mappings"("tenant_id", "connection_id");

CREATE UNIQUE INDEX "notion_task_links_task_id_key" ON "notion_task_links"("task_id");
CREATE UNIQUE INDEX "notion_task_links_tenant_id_notion_page_id_key" ON "notion_task_links"("tenant_id", "notion_page_id");
CREATE INDEX "notion_task_links_tenant_id_mapping_id_idx" ON "notion_task_links"("tenant_id", "mapping_id");
CREATE INDEX "notion_task_links_tenant_id_sync_state_idx" ON "notion_task_links"("tenant_id", "sync_state");

CREATE INDEX "notion_sync_jobs_tenant_id_status_created_at_idx" ON "notion_sync_jobs"("tenant_id", "status", "created_at");
CREATE INDEX "notion_sync_jobs_tenant_id_mapping_id_idx" ON "notion_sync_jobs"("tenant_id", "mapping_id");

CREATE INDEX "notion_sync_conflicts_tenant_id_status_detected_at_idx" ON "notion_sync_conflicts"("tenant_id", "status", "detected_at");
CREATE INDEX "notion_sync_conflicts_tenant_id_mapping_id_idx" ON "notion_sync_conflicts"("tenant_id", "mapping_id");
CREATE INDEX "notion_sync_conflicts_tenant_id_task_id_idx" ON "notion_sync_conflicts"("tenant_id", "task_id");

INSERT INTO "permissions" ("id", "code", "resource", "action", "description", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'integrations:notion_manage',
  'integrations',
  'notion_manage',
  'Conectar y configurar sincronizacion con Notion',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT gen_random_uuid(), roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
CROSS JOIN "permissions"
WHERE roles."code" IN ('owner', 'admin')
  AND permissions."code" = 'integrations:notion_manage'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
