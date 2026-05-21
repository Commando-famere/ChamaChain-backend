const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Get all members (chairperson only)
const getAllMembers = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can view all members' });
        }

        const members = await query(
            `SELECT u.id, u.full_name, u.phone, u.email, u.profile_picture_url,
                    gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.role = 'chairperson' DESC, gm.joined_at ASC`,
            [chamaId]
        );

        res.json({ success: true, data: members.rows, total: members.rows.length });
    } catch (error) {
        console.error('Get all members error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get member details
const getMemberDetails = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;

        const member = await query(
            `SELECT u.id, u.full_name, u.phone, u.email, u.profile_picture_url,
                    gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, memberId]
        );

        if (member.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, data: member.rows[0] });
    } catch (error) {
        console.error('Get member details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAllMembers, getMemberDetails };
