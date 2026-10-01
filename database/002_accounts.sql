-- Extensions required by the account and UI workflows, beyond the supplied dictionary.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN goal text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark'));
ALTER TABLE users ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT users_email_normalized CHECK (email = lower(email));
ALTER TABLE subjects ADD COLUMN color text NOT NULL DEFAULT 'blue';
ALTER TABLE subjects ADD COLUMN is_general boolean NOT NULL DEFAULT false;
ALTER TABLE subjects ADD CONSTRAINT subjects_owner_unique UNIQUE(user_id,id);
ALTER TABLE academic_tasks ADD CONSTRAINT tasks_owned_subject FOREIGN KEY(user_id,subject_id) REFERENCES subjects(user_id,id) ON DELETE CASCADE;
ALTER TABLE academic_tasks ADD CONSTRAINT estimated_minutes_positive CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 10080);
ALTER TABLE study_sessions ADD CONSTRAINT sessions_owned_subject FOREIGN KEY(user_id,subject_id) REFERENCES subjects(user_id,id) ON DELETE CASCADE;
ALTER TABLE study_sessions ADD CONSTRAINT duration_positive CHECK (duration_seconds > 0);
ALTER TABLE task_history ADD COLUMN changes_json jsonb NOT NULL DEFAULT '{}';
ALTER TABLE notification_deliveries ADD COLUMN read_at timestamptz;
ALTER TABLE notification_deliveries ADD COLUMN channel text NOT NULL DEFAULT 'IN_APP';
CREATE UNIQUE INDEX notification_task_schedule_unique ON notification_deliveries(task_id,type,scheduled_at);
CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE auth_tokens (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK(purpose IN ('VERIFY','RESET')), expires_at timestamptz NOT NULL,
  used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens(user_id);
CREATE TABLE development_mail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient text NOT NULL, subject text NOT NULL,
  body text NOT NULL, link text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE weekly_reports ADD COLUMN metrics_json jsonb;
