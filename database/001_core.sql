-- Generated from the supplied dictionary; auth/UI extensions are in 002_accounts.sql.
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TaskDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "TaskCreator" AS ENUM ('USER', 'AGENT', 'SYSTEM');
CREATE TYPE "NotificationType" AS ENUM ('TASK_DUE_24H');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "InsightType" AS ENUM ('TREND', 'COMPARISON', 'ATTENTION', 'RECOMMENDATION', 'ANOMALY', 'SUMMARY');
CREATE TYPE "InsightStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISMISSED');
CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL', 'SYSTEM');
CREATE TYPE "AIExecutionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REJECTED');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE users (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at Timestamptz(6) NOT NULL
);

CREATE TABLE subjects (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  professor TEXT,
  workload_hours DECIMAL(6, 2),
  description TEXT,
  start_date DATE,
  end_date DATE,
  archived_at Timestamptz(6),
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at Timestamptz(6) NOT NULL
);

CREATE TABLE academic_tasks (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status "TaskStatus" NOT NULL DEFAULT 'TODO',
  priority "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  difficulty "TaskDifficulty" NOT NULL DEFAULT 'MEDIUM',
  due_date Timestamptz(6),
  estimated_minutes INTEGER,
  completed_at Timestamptz(6),
  created_by "TaskCreator" NOT NULL DEFAULT 'USER',
  agent_execution_id UUID,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at Timestamptz(6) NOT NULL
);

CREATE TABLE study_sessions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  task_id UUID,
  started_at Timestamptz(6) NOT NULL,
  ended_at Timestamptz(6),
  duration_seconds INTEGER,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_history (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  from_status "TaskStatus",
  to_status "TaskStatus",
  from_priority "TaskPriority",
  to_priority "TaskPriority",
  from_due_date Timestamptz(6),
  to_due_date Timestamptz(6),
  changed_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE push_devices (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at Timestamptz(6) NOT NULL
);

CREATE TABLE notification_deliveries (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  device_id UUID,
  type "NotificationType" NOT NULL,
  status "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  scheduled_at Timestamptz(6) NOT NULL,
  sent_at Timestamptz(6),
  error_message TEXT,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_conversations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at Timestamptz(6) NOT NULL
);

CREATE TABLE ai_messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  role "AIMessageRole" NOT NULL,
  content TEXT NOT NULL,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_tool_executions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  intent TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_json JSONB NOT NULL,
  output_json JSONB,
  status "AIExecutionStatus" NOT NULL DEFAULT 'PENDING',
  model TEXT,
  prompt_version TEXT,
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at Timestamptz(6)
);

CREATE TABLE insights (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type "InsightType" NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence DECIMAL(5, 4),
  period_start Timestamptz(6) NOT NULL,
  period_end Timestamptz(6) NOT NULL,
  metrics_json JSONB NOT NULL,
  dataset_version TEXT,
  model TEXT,
  prompt_version TEXT,
  status "InsightStatus" NOT NULL DEFAULT 'ACTIVE',
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at Timestamptz(6)
);

CREATE TABLE weekly_reports (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status "ReportStatus" NOT NULL DEFAULT 'PENDING',
  storage_key TEXT,
  file_name TEXT,
  generated_at Timestamptz(6),
  created_at Timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE subjects ADD CONSTRAINT subjects_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE academic_tasks ADD CONSTRAINT academic_tasks_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE academic_tasks ADD CONSTRAINT academic_tasks_subject_id_fk FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE academic_tasks ADD CONSTRAINT academic_tasks_agent_execution_id_fk FOREIGN KEY (agent_execution_id) REFERENCES ai_tool_executions(id) ON DELETE SET NULL;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_subject_id_fk FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_task_id_fk FOREIGN KEY (task_id) REFERENCES academic_tasks(id) ON DELETE SET NULL;
ALTER TABLE task_history ADD CONSTRAINT task_history_task_id_fk FOREIGN KEY (task_id) REFERENCES academic_tasks(id) ON DELETE CASCADE;
ALTER TABLE task_history ADD CONSTRAINT task_history_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE push_devices ADD CONSTRAINT push_devices_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_deliveries ADD CONSTRAINT notification_deliveries_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_deliveries ADD CONSTRAINT notification_deliveries_task_id_fk FOREIGN KEY (task_id) REFERENCES academic_tasks(id) ON DELETE CASCADE;
ALTER TABLE notification_deliveries ADD CONSTRAINT notification_deliveries_device_id_fk FOREIGN KEY (device_id) REFERENCES push_devices(id) ON DELETE SET NULL;
ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_conversation_id_fk FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE;
ALTER TABLE ai_tool_executions ADD CONSTRAINT ai_tool_executions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ai_tool_executions ADD CONSTRAINT ai_tool_executions_conversation_id_fk FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL;
ALTER TABLE insights ADD CONSTRAINT insights_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE weekly_reports ADD CONSTRAINT weekly_reports_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX subjects_user_id_idx ON subjects(user_id);
CREATE INDEX academic_tasks_user_id_idx ON academic_tasks(user_id);
CREATE INDEX academic_tasks_subject_id_idx ON academic_tasks(subject_id);
CREATE INDEX academic_tasks_agent_execution_id_idx ON academic_tasks(agent_execution_id);
CREATE INDEX study_sessions_user_id_idx ON study_sessions(user_id);
CREATE INDEX study_sessions_subject_id_idx ON study_sessions(subject_id);
CREATE INDEX study_sessions_task_id_idx ON study_sessions(task_id);
CREATE INDEX task_history_task_id_idx ON task_history(task_id);
CREATE INDEX task_history_user_id_idx ON task_history(user_id);
CREATE INDEX push_devices_user_id_idx ON push_devices(user_id);
CREATE INDEX notification_deliveries_user_id_idx ON notification_deliveries(user_id);
CREATE INDEX notification_deliveries_task_id_idx ON notification_deliveries(task_id);
CREATE INDEX notification_deliveries_device_id_idx ON notification_deliveries(device_id);
CREATE INDEX ai_conversations_user_id_idx ON ai_conversations(user_id);
CREATE INDEX ai_messages_conversation_id_idx ON ai_messages(conversation_id);
CREATE INDEX ai_tool_executions_user_id_idx ON ai_tool_executions(user_id);
CREATE INDEX ai_tool_executions_conversation_id_idx ON ai_tool_executions(conversation_id);
CREATE INDEX insights_user_id_idx ON insights(user_id);
CREATE INDEX weekly_reports_user_id_idx ON weekly_reports(user_id);
CREATE UNIQUE INDEX weekly_reports_user_period_key ON weekly_reports(user_id,period_start,period_end);
CREATE INDEX academic_tasks_due_idx ON academic_tasks(user_id,due_date);
