// Chat Controller
const { query } = require('../config/database');

// Get or create conversation
async function getOrCreateConversation(req, res) {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;

        // Get current user's member ID
        const currentMember = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (currentMember.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member', code: 403 });
        }

        // Check if conversation exists between these members
        let conversation = await query(
            `SELECT c.id, c.type, c.title 
             FROM conversations c
             JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.member_id = $1
             JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.member_id = $2
             WHERE c.type = 'private'`,
            [currentMember.rows[0].id, memberId]
        );

        if (conversation.rows.length === 0) {
            // Create new private conversation
            const newConv = await query(
                `INSERT INTO conversations (chama_id, type, created_by)
                 VALUES ($1, 'private', $2)
                 RETURNING id`,
                [chamaId, currentMember.rows[0].id]
            );
            
            // Add participants
            await query(
                `INSERT INTO conversation_participants (conversation_id, member_id)
                 VALUES ($1, $2), ($1, $3)`,
                [newConv.rows[0].id, currentMember.rows[0].id, memberId]
            );
            
            conversation = await query(
                `SELECT id, type, title FROM conversations WHERE id = $1`,
                [newConv.rows[0].id]
            );
        }

        // Get messages
        const messages = await query(
            `SELECT m.*, u.full_name as sender_name, u.profile_picture_url
             FROM messages m
             JOIN group_members gm ON m.sender_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC
             LIMIT 100`,
            [conversation.rows[0].id]
        );

        res.json({
            success: true,
            data: {
                conversation: conversation.rows[0],
                messages: messages.rows
            }
        });

    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to get conversation', code: 500 });
    }
}

// Send message
async function sendMessage(req, res) {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const { message_text, media_url, media_type } = req.body;

        // Get member ID
        const member = await query(
            `SELECT id FROM group_members WHERE user_id = $1`,
            [userId]
        );

        if (member.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member', code: 403 });
        }

        const result = await query(
            `INSERT INTO messages (conversation_id, sender_id, message_text, media_url, media_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [conversationId, member.rows[0].id, message_text, media_url, media_type]
        );

        // Update conversation updated_at
        await query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [conversationId]);

        res.status(201).json({
            success: true,
            message: 'Message sent',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message', code: 500 });
    }
}

// Get group chat
async function getGroupChat(req, res) {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        // Get group conversation
        const conversation = await query(
            `SELECT id FROM conversations WHERE chama_id = $1 AND type = 'group'`,
            [chamaId]
        );

        if (conversation.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Group chat not found', code: 404 });
        }

        const messages = await query(
            `SELECT m.*, u.full_name as sender_name, u.profile_picture_url
             FROM messages m
             JOIN group_members gm ON m.sender_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC
             LIMIT 100`,
            [conversation.rows[0].id]
        );

        res.json({
            success: true,
            data: {
                conversation: conversation.rows[0],
                messages: messages.rows
            }
        });

    } catch (error) {
        console.error('Get group chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to get group chat', code: 500 });
    }
}

module.exports = { getOrCreateConversation, sendMessage, getGroupChat };
