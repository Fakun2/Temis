-- AlterTable
ALTER TABLE "tenant_onboarding_checklist_items" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "tenant_onboarding_checklist_items" RENAME CONSTRAINT "tenant_onboarding_checklist_items_tenant_membership_fkey" TO "tenant_onboarding_checklist_items_tenant_id_tenant_members_fkey";

-- RenameIndex
ALTER INDEX "tenant_onboarding_checklist_items_tenant_id_tenant_members_idx" RENAME TO "tenant_onboarding_checklist_items_tenant_id_tenant_membersh_idx";

-- RenameIndex
ALTER INDEX "tenant_onboarding_checklist_items_tenant_id_tenant_members_key" RENAME TO "tenant_onboarding_checklist_items_tenant_id_tenant_membersh_key";
