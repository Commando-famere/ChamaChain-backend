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
                    gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount,
                    COALESCE(mb.balance_usdt, 0) as balance
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN member_balances mb ON mb.member_id = u.id AND mb.chama_id = gm.chama_id
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

// Update member role (chairperson only)
const updateMemberRole = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const { new_role } = req.body;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can update roles' });
        }

        await query(
            `UPDATE group_members SET role = $1 WHERE chama_id = $2 AND user_id = $3`,
            [new_role, chamaId, memberId]
        );

        await recordActivity(chamaId, 'member_role_updated', userId);
        res.json({ success: true, message: `Member role updated to ${new_role}` });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove member (chairperson only)
const removeMember = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can remove members' });
        }

        await query(
            `UPDATE group_members SET is_active = false WHERE chama_id = $1 AND user_id = $2`,
            [chamaId, memberId]
        );

        await recordActivity(chamaId, 'member_removed', userId);
        res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get member details
const getMemberDetails = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;

        const member = await query(
            `SELECT u.id, u.full_name, u.phone, u.email, u.profile_picture_url,
                    gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount,
                    COALESCE(mb.balance_usdt, 0) as balance
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN member_balances mb ON mb.member_id = u.id AND mb.chama_id = gm.chama_id
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

module.exports = { getAllMembers, updateMemberRole, removeMember, getMemberDetails };
