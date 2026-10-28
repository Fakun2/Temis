CREATE TYPE "PlatformHealthComponent" AS ENUM (
  'api',
  'postgresql',
  'redis',
  'rabbitmq',
  'worker'
);

CREATE TYPE "PlatformHealthStatus" AS ENUM (
  'healthy',
  'degraded',
  'unavailable'
);

CREATE TABLE "platform_health_samples" (
  "id" UUID NOT NULL,
  "component" "PlatformHealthComponent" NOT NULL,
  "status" "PlatformHealthStatus" NOT NULL,
  "latency_ms" INTEGER,
  "sampled_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_health_samples_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_health_samples_component_sampled_at_key"
  ON "platform_health_samples"("component", "sampled_at");

CREATE INDEX "platform_health_samples_sampled_at_idx"
  ON "platform_health_samples"("sampled_at");
