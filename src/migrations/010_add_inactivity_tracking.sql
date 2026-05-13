-- =====================================================
-- MIGRATION 010: INACTIVITY TRACKING
-- Add columns to track chama activity and lock features
-- =====================================================

-- Add inactivity tracking columns to chamas
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS inactivity_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE chamas ADD COLUMN IF NOT EXISTS last_reactivated_at TIMESTAMP;

-- Create activity log table
CREATE TABLE IF NOT EXISTS chama_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chamas_last_activity ON chamas(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_chamas_inactivity_status ON chamas(inactivity_status);
CREATE INDEX IF NOT EXISTS idx_chama_activity_log_chama ON chama_activity_log(chama_id);
CREATE INDEX IF NOT EXISTS idx_chama_activity_log_created ON chama_activity_log(created_at);

-- Create function to check inactivity
CREATE OR REPLACE FUNCTION update_chama_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chamas 
    SET last_activity_at = NOW(), 
        is_active = TRUE, 
        inactivity_status = 'active'
    WHERE id = NEW.chama_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity log
CREATE TRIGGER trigger_update_chama_activity
    AFTER INSERT ON chama_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_chama_activity();

-- Create function to check inactive chamas
CREATE OR REPLACE FUNCTION check_inactive_chamas()
RETURNS void AS $$
BEGIN
    UPDATE chamas 
    SET is_active = FALSE, 
        inactivity_status = 'inactive'
    WHERE last_activity_at < NOW() - INTERVAL '30 days'
      AND plan IN ('members_only', 'full_money')
      AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;
