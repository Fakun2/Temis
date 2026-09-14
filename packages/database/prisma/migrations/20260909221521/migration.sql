-- AlterTable
ALTER TABLE "notion_connections" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notion_sync_conflicts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notion_sync_jobs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notion_task_board_mappings" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notion_task_links" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "notion_connections" RENAME CONSTRAINT "notion_connections_connected_by_membership_fkey" TO "notion_connections_tenant_id_connected_by_membership_id_fkey";

-- RenameIndex
ALTER INDEX "google_calendar_event_links_connection_id_resource_type_resourc" RENAME TO "google_calendar_event_links_connection_id_resource_type_res_key";

-- RenameIndex
ALTER INDEX "google_calendar_event_links_google_calendar_id_google_event_id_" RENAME TO "google_calendar_event_links_google_calendar_id_google_event_key";

-- RenameIndex
ALTER INDEX "google_calendar_event_links_tenant_id_resource_type_resource_id" RENAME TO "google_calendar_event_links_tenant_id_resource_type_resourc_idx";
