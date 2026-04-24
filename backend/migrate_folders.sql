-- Folders feature migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql

-- 1. Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add folder_id column to chats (nullable, SET NULL on folder delete)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON chats(folder_id);
