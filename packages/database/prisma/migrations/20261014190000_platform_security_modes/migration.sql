CREATE TYPE "PlatformSecurityMode" AS ENUM ('disabled', 'required');

ALTER TABLE "platform_sessions"
  ADD COLUMN "security_mode" "PlatformSecurityMode" NOT NULL DEFAULT 'required',
  ALTER COLUMN "device_id" DROP NOT NULL,
  ALTER COLUMN "posture_checked_at" DROP NOT NULL;
