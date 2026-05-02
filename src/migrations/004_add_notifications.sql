-- =====================================================
-- MIGRATION 004: NOTIFICATIONS
-- User preferences and notification history
-- =====================================================

-- 1. NOTIFICATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    play_sounds BOOLEAN DEFAULT TRUE,
    sound_volume INTEGER DEFAULT 80 CHECK (sound_volume >= 0 AND sound_volume <= 100),
    selected_sound_theme VARCHAR(50) DEFAULT 'default',
    enable_push_notifications BOOLEAN DEFAULT TRUE,
    enable_email_notifications BOOLEAN DEFAULT FALSE,
    enable_sms_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. NOTIFICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chama_id UUID REFERENCES chamas(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    sound_played VARCHAR(100),
    title VARCHAR(255),
    body TEXT,
    was_played BOOLEAN DEFAULT FALSE,
    was_delivered BOOLEAN DEFAULT FALSE,
    error_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. CHAIRPERSON NOTIFICATIONS
CREATE TABLE IF NOT EXISTS chairperson_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    pending_member_id UUID NOT NULL REFERENCES pending_members(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_chama ON notification_logs(chama_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_chairperson_notifications_chama ON chairperson_notifications(chama_id);
CREATE INDEX IF NOT EXISTS idx_chairperson_notifications_read ON chairperson_notifications(is_read);

-- 5. TRIGGER: Update updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- 6. COMMENTS
COMMENT ON TABLE notification_settings IS 'User preferences for notifications';
COMMENT ON TABLE notification_logs IS 'History of all notifications sent';
COMMENT ON TABLE chairperson_notifications IS 'Pending approval notifications for chairperson';
