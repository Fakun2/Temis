ALTER TYPE "GoogleCalendarConnectionStatus" ADD VALUE IF NOT EXISTS 'provisioning' BEFORE 'connected';
ALTER TYPE "GoogleCalendarConnectionStatus" ADD VALUE IF NOT EXISTS 'disconnecting' AFTER 'reauthorization_required';
