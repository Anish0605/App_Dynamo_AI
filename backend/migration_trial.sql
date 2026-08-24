-- ============================================================
-- Pro Validation Programme — Database Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql/new
-- ============================================================

-- 1. trial_invites
--    One row per invite code issued by admin.
CREATE TABLE IF NOT EXISTS trial_invites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL,
    code            TEXT NOT NULL UNIQUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    used_at         TIMESTAMPTZ,
    used_by         UUID REFERENCES users(id),
    revoked         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_trial_invites_code  ON trial_invites(code);
CREATE INDEX IF NOT EXISTS idx_trial_invites_email ON trial_invites(email);

-- 2. trial_feedback
--    Post-trial survey responses (UI form is a future task; endpoint exists now).
CREATE TABLE IF NOT EXISTS trial_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    subscription_id TEXT,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text   TEXT,
    would_upgrade   BOOLEAN,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_feedback_user ON trial_feedback(user_id);

-- 3. subscription_events
--    Immutable event log for Razorpay subscription lifecycle.
CREATE TABLE IF NOT EXISTS subscription_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    razorpay_sub_id     TEXT,
    event               TEXT NOT NULL,
    payload             JSONB,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_user   ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_sub_id ON subscription_events(razorpay_sub_id);
