-- =====================================================
-- MIGRATION 006: SUBSCRIPTIONS
-- Chama subscription plans and payments
-- =====================================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID UNIQUE NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    plan chama_plan NOT NULL,
    amount_kes INT NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    current_period_start DATE DEFAULT CURRENT_DATE,
    current_period_end DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    auto_renew BOOLEAN DEFAULT TRUE,
    last_payment_date DATE,
    next_payment_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. SUBSCRIPTION PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount_kes INT NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_chama ON subscriptions(chama_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);

-- 4. TRIGGER: Auto-create subscription on chama creation
CREATE OR REPLACE FUNCTION create_chama_subscription()
RETURNS TRIGGER AS $$
DECLARE
    amount INT;
BEGIN
    IF NEW.plan = 'free' THEN
        amount := 0;
    ELSIF NEW.plan = 'members_only' THEN
        amount := 50;
    ELSE
        amount := 150;
    END IF;
    
    INSERT INTO subscriptions (chama_id, plan, amount_kes, next_payment_date)
    VALUES (NEW.id, NEW.plan, amount, CURRENT_DATE + INTERVAL '30 days');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_chama_subscription
    AFTER INSERT ON chamas
    FOR EACH ROW
    EXECUTE FUNCTION create_chama_subscription();

-- 5. COMMENTS
COMMENT ON TABLE subscriptions IS 'Chama subscription plans and status';
COMMENT ON TABLE subscription_payments IS 'Payment history for subscriptions';
