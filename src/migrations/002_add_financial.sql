-- =====================================================
-- MIGRATION 002: FINANCIAL TABLES
-- Deposits, Withdrawals, Loans, Fines
-- =====================================================

-- 1. TRANSACTION LEDGER TABLE
CREATE TABLE IF NOT EXISTS transaction_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount_usdt DECIMAL(20,8) NOT NULL,
    payment_method VARCHAR(20),
    transaction_reference VARCHAR(100),
    destination_wallet TEXT,
    notes TEXT,
    status transaction_status DEFAULT 'pending',
    recorded_by UUID REFERENCES group_members(id),
    approved_by UUID REFERENCES group_members(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. LOANS TABLE
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    amount_usdt DECIMAL(20,8) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    repayment_weeks INT NOT NULL,
    weekly_installment_usdt DECIMAL(20,8) NOT NULL,
    purpose TEXT,
    status loan_status DEFAULT 'pending',
    approved_by UUID REFERENCES group_members(id),
    approved_at TIMESTAMP,
    repaid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. LOAN REPAYMENTS TABLE
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount_usdt DECIMAL(20,8) NOT NULL,
    week_number INT NOT NULL,
    paid_at TIMESTAMP DEFAULT NOW()
);

-- 4. FINES TABLE
CREATE TABLE IF NOT EXISTS fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    fine_type VARCHAR(50) NOT NULL,
    amount_usdt DECIMAL(20,8) NOT NULL,
    reason TEXT,
    related_transaction_id UUID REFERENCES transaction_ledger(id),
    recorded_by UUID REFERENCES group_members(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

-- 5. CHAMA BALANCES (Virtual)
CREATE TABLE IF NOT EXISTS chama_balances (
    chama_id UUID PRIMARY KEY REFERENCES chamas(id) ON DELETE CASCADE,
    balance_usdt DECIMAL(20,8) DEFAULT 0,
    last_reconciled_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. MEMBER BALANCES (Virtual)
CREATE TABLE IF NOT EXISTS member_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    balance_usdt DECIMAL(20,8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(chama_id, member_id)
);

-- 7. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_chama ON transaction_ledger(chama_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transaction_ledger(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transaction_ledger(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transaction_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_loans_chama ON loans(chama_id);
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_fines_chama ON fines(chama_id);
CREATE INDEX IF NOT EXISTS idx_fines_member ON fines(member_id);

-- 8. COMMENTS
COMMENT ON TABLE transaction_ledger IS 'All financial transactions (immutable audit trail)';
COMMENT ON TABLE loans IS 'Member loan requests';
COMMENT ON TABLE loan_repayments IS 'Installment payments for loans';
COMMENT ON TABLE fines IS 'Penalties for late payments, absenteeism, etc.';
COMMENT ON TABLE chama_balances IS 'Virtual balance per chama';
COMMENT ON TABLE member_balances IS 'Virtual balance per member within a chama';
