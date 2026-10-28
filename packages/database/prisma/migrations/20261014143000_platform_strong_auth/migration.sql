CREATE TYPE "PlatformSecurityStatus" AS ENUM ('pending', 'active', 'revoked');
CREATE TYPE "PlatformSecurityEventOutcome" AS ENUM ('success', 'denied', 'error');

CREATE TABLE "platform_authenticators" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "credential_id" TEXT NOT NULL,
  "public_key" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "aaguid" TEXT NOT NULL,
  "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "name" TEXT NOT NULL,
  "status" "PlatformSecurityStatus" NOT NULL DEFAULT 'pending',
  "last_used_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "platform_authenticators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_devices" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "external_device_id" TEXT NOT NULL,
  "certificate_fingerprint" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" "PlatformSecurityStatus" NOT NULL DEFAULT 'pending',
  "last_compliant_at" TIMESTAMPTZ(6),
  "last_seen_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "platform_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "refresh_family_id" UUID NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "previous_token_hash" TEXT,
  "status" "PlatformSecurityStatus" NOT NULL DEFAULT 'active',
  "auth_methods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "authenticated_at" TIMESTAMPTZ(6) NOT NULL,
  "step_up_at" TIMESTAMPTZ(6),
  "posture_checked_at" TIMESTAMPTZ(6) NOT NULL,
  "last_activity_at" TIMESTAMPTZ(6) NOT NULL,
  "absolute_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "refresh_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_bootstrap_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_bootstrap_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_security_events" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "device_id" UUID,
  "session_id" UUID,
  "event_type" TEXT NOT NULL,
  "outcome" "PlatformSecurityEventOutcome" NOT NULL,
  "reason" TEXT,
  "ip_address" TEXT,
  "user_agent_hash" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_security_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_authenticators_credential_id_key" ON "platform_authenticators"("credential_id");
CREATE INDEX "platform_authenticators_user_id_status_idx" ON "platform_authenticators"("user_id", "status");
CREATE UNIQUE INDEX "platform_devices_certificate_fingerprint_key" ON "platform_devices"("certificate_fingerprint");
CREATE UNIQUE INDEX "platform_devices_provider_external_device_id_key" ON "platform_devices"("provider", "external_device_id");
CREATE INDEX "platform_devices_user_id_status_idx" ON "platform_devices"("user_id", "status");
CREATE INDEX "platform_sessions_user_id_status_idx" ON "platform_sessions"("user_id", "status");
CREATE INDEX "platform_sessions_device_id_status_idx" ON "platform_sessions"("device_id", "status");
CREATE INDEX "platform_sessions_refresh_family_id_idx" ON "platform_sessions"("refresh_family_id");
CREATE INDEX "platform_sessions_absolute_expires_at_idx" ON "platform_sessions"("absolute_expires_at");
CREATE UNIQUE INDEX "platform_bootstrap_tokens_token_hash_key" ON "platform_bootstrap_tokens"("token_hash");
CREATE INDEX "platform_bootstrap_tokens_user_id_expires_at_idx" ON "platform_bootstrap_tokens"("user_id", "expires_at");
CREATE INDEX "platform_security_events_user_id_created_at_idx" ON "platform_security_events"("user_id", "created_at");
CREATE INDEX "platform_security_events_device_id_created_at_idx" ON "platform_security_events"("device_id", "created_at");
CREATE INDEX "platform_security_events_event_type_outcome_created_at_idx" ON "platform_security_events"("event_type", "outcome", "created_at");

ALTER TABLE "platform_authenticators" ADD CONSTRAINT "platform_authenticators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_devices" ADD CONSTRAINT "platform_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "platform_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_bootstrap_tokens" ADD CONSTRAINT "platform_bootstrap_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_security_events" ADD CONSTRAINT "platform_security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "platform_security_events" ADD CONSTRAINT "platform_security_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "platform_devices"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "platform_security_events" ADD CONSTRAINT "platform_security_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "platform_sessions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
