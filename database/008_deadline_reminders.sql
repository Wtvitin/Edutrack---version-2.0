-- Keep the old enum for backwards compatibility and historical records.
-- New reminders have priority-dependent windows, not a fixed 24-hour window.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_DEADLINE';
