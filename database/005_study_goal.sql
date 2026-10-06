ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal_minutes integer NOT NULL DEFAULT 0 CHECK (weekly_goal_minutes BETWEEN 0 AND 10080);
