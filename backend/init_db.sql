CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plan TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trial_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    subscription_id TEXT,
    rating INTEGER,
    feedback_text TEXT,
    would_upgrade BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);
