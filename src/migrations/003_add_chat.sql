-- =====================================================
-- MIGRATION 003: CHAT SYSTEM
-- Real-time messaging between members
-- =====================================================

-- 1. CONVERSATIONS TABLE
CREATE TYPE conversation_type AS ENUM ('group', 'private');

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    type conversation_type NOT NULL,
    title VARCHAR(255),
    created_by UUID REFERENCES group_members(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(conversation_id, member_id)
);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    message_text TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for_everyone BOOLEAN DEFAULT FALSE,
    reply_to_id UUID REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP
);

-- 4. MESSAGE STATUS TABLE
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    UNIQUE(message_id, member_id)
);

-- 5. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_conversations_chama ON conversations(chama_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_member ON conversation_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_member ON message_status(member_id);

-- 6. TRIGGER: Auto-create group conversation when chama is created
CREATE OR REPLACE FUNCTION create_chama_group_conversation()
RETURNS TRIGGER AS $$
DECLARE
    conv_id UUID;
BEGIN
    INSERT INTO conversations (chama_id, type, title)
    VALUES (NEW.id, 'group', NEW.name || ' Group Chat')
    RETURNING id INTO conv_id;
    
    INSERT INTO conversation_participants (conversation_id, member_id)
    SELECT conv_id, id FROM group_members WHERE chama_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_chama_group_conversation
    AFTER INSERT ON chamas
    FOR EACH ROW
    EXECUTE FUNCTION create_chama_group_conversation();

-- 7. TRIGGER: Auto-add member to group conversation
CREATE OR REPLACE FUNCTION add_member_to_group_conversation()
RETURNS TRIGGER AS $$
DECLARE
    conv_id UUID;
BEGIN
    SELECT id INTO conv_id FROM conversations 
    WHERE chama_id = NEW.chama_id AND type = 'group' LIMIT 1;
    
    IF conv_id IS NOT NULL THEN
        INSERT INTO conversation_participants (conversation_id, member_id)
        VALUES (conv_id, NEW.id)
        ON CONFLICT (conversation_id, member_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_member_to_group_conversation
    AFTER INSERT ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION add_member_to_group_conversation();

-- 8. COMMENTS
COMMENT ON TABLE conversations IS 'Chat conversations (group or private)';
COMMENT ON TABLE messages IS 'Chat messages with media support';
COMMENT ON TABLE message_status IS 'Delivery and read receipts';
