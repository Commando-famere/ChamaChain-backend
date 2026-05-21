const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../config/database');

router.use(verifyToken);

// Get all members (chairperson only)
router.get('/chamas/:chamaId/members/all', async (req, res) => {
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
                    gm.role, gm.chama_member_id, gm.joined_at
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
});

// Update member role (chairperson only)
router.put('/chamas/:chamaId/members/:memberId/role', async (req, res) => {
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

        res.json({ success: true, message: `Member role updated to ${new_role}` });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remove member (chairperson only)
router.delete('/chamas/:chamaId/members/:memberId', async (req, res) => {
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

        res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
