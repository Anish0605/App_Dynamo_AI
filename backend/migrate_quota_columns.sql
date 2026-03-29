-- Migration: Add monthly image/video quota columns to users table
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS image_count_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_count_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_month TEXT DEFAULT '';

-- Optionally reset all existing users' monthly counters to current month
UPDATE users
SET quota_month = TO_CHAR(NOW(), 'YYYY-MM')
WHERE quota_month IS NULL OR quota_month = '';
