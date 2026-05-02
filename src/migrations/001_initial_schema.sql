-- =====================================================
-- MIGRATION 001: INITIAL SCHEMA
-- ChamaChain Database - Core Tables
-- =====================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM (
    'chairperson', 'vice_chairperson', 'secretary', 'assistant_secretary',
    'treasurer', 'assistant_treasurer', 'auditor', 'trustee',
    'member', 'organizing_secretary', 'project_coordinator',
    'welfare_officer', 'publicity_secretary', 'patron', 'chief_member'
);

CREATE TYPE chama_plan AS ENUM ('free', 'members_only', 'full_money');

CREATE TYPE transaction_type AS ENUM (
    'deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment',
    'fine', 'adjustment', 'dividend', 'refund', 'transfer'
);

CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');

CREATE TYPE loan_status AS ENUM ('pending', 'active', 'repaid', 'defaulted');

CREATE TYPE approval_mode AS ENUM ('auto', 'manual');

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    global_user_id VARCHAR(20) UNIQUE,
    profile_picture_url TEXT,
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    national_id VARCHAR(20),
    county VARCHAR(50),
    town VARCHAR(50),
    occupation VARCHAR(100),
    emergency_name VARCHAR(100),
    emergency_phone VARCHAR(20),
    alternative_phone VARCHAR(20),
    physical_address TEXT,
    whatsapp_number VARCHAR(20),
    transaction_pin VARCHAR(255),
    pin_setup BOOLEAN DEFAULT FALSE,
    pin_failed_attempts INT DEFAULT 0,
    pin_locked_until TIMESTAMP,
    account_status VARCHAR(20) DEFAULT 'active',
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CHAMAS TABLE
CREATE TABLE IF NOT EXISTS chamas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    plan chama_plan NOT NULL DEFAULT 'free',
    approval_mode approval_mode DEFAULT 'auto',
    bybit_main_wallet TEXT,
    created_by UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    chama_member_id VARCHAR(10),
    invited_by UUID REFERENCES users(id),
    member_since DATE DEFAULT CURRENT_DATE,
    voting_rights BOOLEAN DEFAULT TRUE,
    shareholding_amount DECIMAL(12,2) DEFAULT 0,
    regular_contribution_amount DECIMAL(12,2),
    regular_contribution_frequency VARCHAR(20),
    payment_method VARCHAR(20),
    mpesa_registered_name VARCHAR(100),
    bank_account_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    max_loan_limit DECIMAL(12,2),
    signed_bylaws_at TIMESTAMP,
    agreed_to_penalty BOOLEAN DEFAULT FALSE,
    agreed_to_withdrawal_rules BOOLEAN DEFAULT FALSE,
    agreed_to_emergency_clause BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(chama_id, user_id)
);

-- 5. ROLE PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
    role_name user_role PRIMARY KEY,
    can_view_all_members BOOLEAN DEFAULT FALSE,
    can_invite_members BOOLEAN DEFAULT FALSE,
    can_remove_members BOOLEAN DEFAULT FALSE,
    can_assign_roles BOOLEAN DEFAULT FALSE,
    can_approve_final_decisions BOOLEAN DEFAULT FALSE,
    can_view_all_transactions BOOLEAN DEFAULT FALSE,
    can_create_transaction BOOLEAN DEFAULT FALSE,
    can_approve_transaction BOOLEAN DEFAULT FALSE,
    can_withdraw_funds BOOLEAN DEFAULT FALSE,
    can_create_meeting BOOLEAN DEFAULT FALSE,
    can_edit_minutes BOOLEAN DEFAULT FALSE,
    can_view_audit_logs BOOLEAN DEFAULT FALSE,
    can_flag_discrepancy BOOLEAN DEFAULT FALSE,
    can_manage_welfare_cases BOOLEAN DEFAULT FALSE,
    can_manage_projects BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES users(id),
    role user_role NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    email_or_phone VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. PENDING MEMBERS TABLE (for manual approval)
CREATE TABLE IF NOT EXISTS pending_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    invite_token VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    invited_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id)
);

-- 9. MEETING MINUTES TABLE
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    secretary_id UUID NOT NULL REFERENCES group_members(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    photos TEXT[],
    documents TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. MEETING ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS meeting_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meeting_minutes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'present',
    arrived_at TIME,
    notes TEXT,
    recorded_by UUID REFERENCES group_members(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(meeting_id, member_id)
);

-- 11. WELFARE CASES TABLE
CREATE TABLE IF NOT EXISTS welfare_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    welfare_officer_id UUID REFERENCES group_members(id),
    case_type VARCHAR(50),
    description TEXT,
    amount_usdt DECIMAL(20,8),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- 12. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_global_id ON users(global_user_id);
CREATE INDEX IF NOT EXISTS idx_chamas_created_by ON chamas(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_chama ON group_members(chama_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_chama ON invitations(chama_id);
CREATE INDEX IF NOT EXISTS idx_pending_members_chama ON pending_members(chama_id);
CREATE INDEX IF NOT EXISTS idx_pending_members_status ON pending_members(status);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_chama ON meeting_minutes(chama_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting ON meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_welfare_cases_member ON welfare_cases(member_id);

-- 13. TRIGGER: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_chamas_updated_at
    BEFORE UPDATE ON chamas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. COMMENTS
COMMENT ON TABLE users IS 'System users/app members';
COMMENT ON TABLE chamas IS 'Chama groups';
COMMENT ON TABLE group_members IS 'Members belonging to chamas with roles';
COMMENT ON TABLE role_permissions IS 'Granular permissions for each role';
COMMENT ON TABLE invitations IS 'Invite links generated by chairperson';
COMMENT ON TABLE pending_members IS 'Members waiting for chairperson approval';
COMMENT ON TABLE meeting_minutes IS 'Meeting records with optional photo uploads';
COMMENT ON TABLE meeting_attendance IS 'Member attendance for each meeting';
COMMENT ON TABLE welfare_cases IS 'Welfare support cases for members';
