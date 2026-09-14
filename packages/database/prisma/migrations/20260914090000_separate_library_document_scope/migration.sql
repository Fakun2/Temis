CREATE TYPE "DocumentScope" AS ENUM ('library', 'case');

ALTER TYPE "DocumentStorageCleanupJobReason" ADD VALUE IF NOT EXISTS 'document_replaced';

ALTER TABLE "document_folders"
  ADD COLUMN "scope" "DocumentScope" NOT NULL DEFAULT 'library';

ALTER TABLE "documents"
  ADD COLUMN "scope" "DocumentScope" NOT NULL DEFAULT 'library';

-- Case files belong to the case module, never to a library folder.
UPDATE "documents"
SET "scope" = 'case', "folder_id" = NULL
WHERE "case_id" IS NOT NULL;

-- Folders created by the previous case-folder migration must not appear in Biblioteca.
UPDATE "document_folders"
SET "scope" = 'case'
WHERE "notes" IN (
  'system:case-library:client-uuid',
  'system:case-library:client-name',
  'system:case-library:case-uuid',
  'system:case-library:case-name'
);

-- Remove only now-empty automatic folders, deepest first. Non-empty folders are retained safely.
DELETE FROM "document_folders" folder
WHERE folder."scope" = 'case'
  AND NOT EXISTS (SELECT 1 FROM "documents" d WHERE d."folder_id" = folder."id")
  AND NOT EXISTS (SELECT 1 FROM "document_folders" child WHERE child."parent_id" = folder."id");

CREATE INDEX "document_folders_tenant_id_scope_parent_id_idx"
  ON "document_folders"("tenant_id", "scope", "parent_id");
CREATE INDEX "documents_tenant_id_scope_folder_id_created_at_idx"
  ON "documents"("tenant_id", "scope", "folder_id", "created_at");
