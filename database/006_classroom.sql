-- OAuth secrets are encrypted by the backend; never included in /api/data.
CREATE TABLE classroom_connections (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  tokens_encrypted text NOT NULL,
  selected_course_ids jsonb NOT NULL DEFAULT '[]',
  last_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE classroom_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_hash text NOT NULL REFERENCES auth_sessions(token_hash) ON DELETE CASCADE,
  verifier_encrypted text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX classroom_oauth_expiry ON classroom_oauth_states(expires_at);
CREATE TABLE classroom_course_links (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  PRIMARY KEY(user_id,course_id)
);
CREATE TABLE classroom_task_links (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  coursework_id text NOT NULL,
  task_id uuid UNIQUE REFERENCES academic_tasks(id) ON DELETE SET NULL,
  last_imported jsonb NOT NULL,
  PRIMARY KEY(user_id,course_id,coursework_id)
);
