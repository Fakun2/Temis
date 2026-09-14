-- AlterTable
ALTER TABLE "task_board_views" ALTER COLUMN "id" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "task_board_views" RENAME CONSTRAINT "task_board_views_created_by_membership_fkey" TO "task_board_views_tenant_id_created_by_membership_id_fkey";
