CREATE TABLE "password_reset_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumed_at" TIMESTAMPTZ(6),
  "invalidated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "password_reset_codes_user_id_created_at_idx"
  ON "password_reset_codes"("user_id", "created_at");

CREATE INDEX "password_reset_codes_active_lookup_idx"
  ON "password_reset_codes"("user_id", "consumed_at", "invalidated_at", "expires_at");

CREATE UNIQUE INDEX "password_reset_codes_one_active_per_user_key"
  ON "password_reset_codes"("user_id")
  WHERE "consumed_at" IS NULL AND "invalidated_at" IS NULL;
