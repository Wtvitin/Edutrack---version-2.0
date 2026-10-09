-- Remote observations never modify academic_tasks.status or account revisions.
ALTER TABLE classroom_connections ADD COLUMN last_delivery_check_at timestamptz;
ALTER TABLE classroom_task_links ADD COLUMN submission_state text NOT NULL DEFAULT 'UNKNOWN'
  CHECK (submission_state IN ('UNKNOWN','NEW','CREATED','TURNED_IN','RETURNED','RECLAIMED_BY_STUDENT'));
ALTER TABLE classroom_task_links ADD COLUMN submission_late boolean;
ALTER TABLE classroom_task_links ADD COLUMN submission_checked_at timestamptz;
