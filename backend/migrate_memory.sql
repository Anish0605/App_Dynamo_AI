-- AI Memory table for Dynamo AI
-- Run this in: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql

CREATE TABLE IF NOT EXISTS user_memories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    category    TEXT DEFAULT 'fact',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
