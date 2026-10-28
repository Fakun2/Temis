-- Restore precision for future announcements; previously rounded values cannot be recovered.
ALTER TABLE "platform_announcements" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6);
