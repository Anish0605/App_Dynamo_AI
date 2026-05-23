-- Migration: add last_checked_at to research_watches
-- Run this in the Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql/new

ALTER TABLE research_watches
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
