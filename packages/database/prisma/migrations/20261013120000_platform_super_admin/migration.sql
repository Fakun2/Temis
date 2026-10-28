CREATE TYPE "PlatformRoleCode" AS ENUM ('super_admin');

CREATE TYPE "PlatformRoleAssignmentStatus" AS ENUM ('active', 'revoked');

CREATE TABLE "platform_role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_code" "PlatformRoleCode" NOT NULL DEFAULT 'super_admin',
    "status" "PlatformRoleAssignmentStatus" NOT NULL DEFAULT 'active',
    "provisioned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "platform_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_role_assignments_user_id_key"
ON "platform_role_assignments"("user_id");

CREATE INDEX "platform_role_assignments_status_role_code_idx"
ON "platform_role_assignments"("status", "role_code");

ALTER TABLE "platform_role_assignments"
ADD CONSTRAINT "platform_role_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
