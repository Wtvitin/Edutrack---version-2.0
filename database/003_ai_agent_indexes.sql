CREATE INDEX IF NOT EXISTS ai_conversations_user_updated_idx ON ai_conversations(user_id,updated_at);
CREATE INDEX IF NOT EXISTS ai_messages_conversation_created_idx ON ai_messages(conversation_id,created_at);
