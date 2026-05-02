-- =====================================================
-- SEED 002: SYSTEM SETTINGS
-- Default configuration values
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
('base_url', 'http://localhost:3000', 'Current app base URL'),
('jwt_expiry_minutes', '5', 'JWT token expiry in minutes'),
('session_expiry_minutes', '5', 'Session expiry without heartbeat'),
('heartbeat_interval_seconds', '30', 'Heartbeat interval in seconds'),
('max_free_members', '10', 'Maximum members allowed on free plan'),
('members_only_price_kes', '50', 'Monthly price for Members Only plan'),
('full_money_price_kes', '150', 'Monthly price for Full + Money plan'),
('invite_link_expiry_days', '7', 'Number of days until invite link expires'),
('withdrawal_network_fee_usdt', '0.5', 'Bybit network fee per withdrawal'),
('platform_fee_per_withdrawal_usdt', '0.5', 'Platform fee per withdrawal'),
('enable_websocket', 'true', 'Enable WebSocket for real-time chat'),
('maintenance_mode', 'false', 'Put app in maintenance mode'),
('ocr_enabled', 'true', 'Enable OCR for meeting minutes'),
('allowed_ips', '[]', 'JSON array of allowed IP addresses'),
('smtp_host', '', 'Email SMTP host'),
('smtp_port', '587', 'Email SMTP port'),
('smtp_user', '', 'Email SMTP username'),
('smtp_pass', '', 'Email SMTP password'),
('twilio_account_sid', '', 'Twilio account SID for SMS'),
('twilio_auth_token', '', 'Twilio auth token'),
('twilio_phone_number', '', 'Twilio phone number')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;
