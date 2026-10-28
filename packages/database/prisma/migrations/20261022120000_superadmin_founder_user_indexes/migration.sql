CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "users_created_at_id_idx"
  ON "users" ("created_at", "id");

CREATE INDEX IF NOT EXISTS "users_full_name_id_idx"
  ON "users" ("full_name", "id");

CREATE INDEX IF NOT EXISTS "users_last_login_at_id_idx"
  ON "users" ("last_login_at", "id");

CREATE INDEX IF NOT EXISTS "users_status_id_idx"
  ON "users" ("status", "id");

CREATE INDEX IF NOT EXISTS "users_email_trgm_idx"
  ON "users" USING GIN ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "users_full_name_trgm_idx"
  ON "users" USING GIN ("full_name" gin_trgm_ops);
