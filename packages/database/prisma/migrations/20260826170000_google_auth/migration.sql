ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE TABLE "user_identities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_identities_provider_provider_user_id_key"
  ON "user_identities"("provider", "provider_user_id");

CREATE INDEX "user_identities_user_id_idx"
  ON "user_identities"("user_id");

ALTER TABLE "user_identities"
  ADD CONSTRAINT "user_identities_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
