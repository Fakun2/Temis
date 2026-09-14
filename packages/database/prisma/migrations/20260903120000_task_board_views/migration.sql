CREATE TABLE "task_board_views" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "created_by_membership_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "task_board_views_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "task_board_views"
  ADD CONSTRAINT "task_board_views_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_board_views"
  ADD CONSTRAINT "task_board_views_created_by_membership_fkey"
  FOREIGN KEY ("tenant_id", "created_by_membership_id")
  REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "task_board_views_tenant_id_created_at_idx"
  ON "task_board_views"("tenant_id", "created_at");

CREATE INDEX "task_board_views_tenant_id_created_by_membership_id_idx"
  ON "task_board_views"("tenant_id", "created_by_membership_id");
