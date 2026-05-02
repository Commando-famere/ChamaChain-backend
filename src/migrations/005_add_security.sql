-- =====================================================
-- MIGRATION 005: SECURITY TABLES
-- Sessions, IP whitelist, audit logs
-- =====================================================

-- 1. USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    last_heartbeat TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- 2. DEVICE FINGERPRINTS TABLE
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    fingerprint_hash TEXT NOT NULL,
    last_seen_at TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- 3. BLOCKED IPS TABLE
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET UNIQUE NOT NULL,
    reason VARCHAR(255),
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. REQUEST LOGS TABLE
CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET,
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    was_binary BOOLEAN DEFAULT FALSE,
    was_rejected BOOLEAN DEFAULT FALSE,
    reject_reason VARCHAR(255),
    status_code INT,
    response_time_ms INT,
    headers JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ADMIN SECRETS TABLE
CREATE TABLE IF NOT EXISTS admin_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret_hash TEXT NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    chama_id UUID REFERENCES chamas(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON request_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_chama ON audit_logs(chama_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 8. CLEANUP FUNCTION FOR EXPIRED SESSIONS
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    DELETE FROM blocked_ips 
    WHERE blocked_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. COMMENTS
COMMENT ON TABLE user_sessions IS 'Active user sessions with heartbeat';
COMMENT ON TABLE device_fingerprints IS 'Trusted devices per user';
COMMENT ON TABLE blocked_ips IS 'Auto-banned IP addresses';
COMMENT ON TABLE request_logs IS 'All API requests for monitoring';
COMMENT ON TABLE admin_secrets IS 'Additional secrets for admin access';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all actions';
