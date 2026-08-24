-- Faculty Ambassador Program (FAP) — Supabase Migration
-- Run this in: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql/new

-- 1. Partner Applications
CREATE TABLE IF NOT EXISTS partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    department TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending | Approved | Rejected
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Partners (created on approval)
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    application_id UUID REFERENCES partner_applications(id),
    referral_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active', -- Active | Inactive
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Referrals (when someone signs up using a ref code)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT,                           -- plan at time of first payment
    status TEXT NOT NULL DEFAULT 'Trial', -- Trial | Paid | Refunded
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(referred_user_id)             -- one referral per user, forever
);

-- 4. Commissions (one-time, on first payment only)
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,             -- in paise (₹120 = 12000, ₹270 = 27000)
    plan TEXT NOT NULL,
    payment_id TEXT,                     -- Razorpay payment_id
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending | Paid
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Payouts (monthly batch)
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,             -- total payout in paise
    transaction_ref TEXT,               -- bank/UPI reference
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending | Paid
    payout_month TEXT,                  -- e.g. "Jul 2026"
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Add referral_code column to users table (stores ref= from signup URL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_partner_id ON referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_partner_id ON commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_payouts_partner_id ON payouts(partner_id);
