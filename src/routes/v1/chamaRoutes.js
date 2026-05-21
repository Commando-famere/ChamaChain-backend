const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../config/database');
const { createChama, confirmPayment, getUserChamas, getChama } = require('../../controllers/chamaController');

router.use(verifyToken);

// Core chama routes
router.post('/', createChama);
router.post('/confirm-payment', confirmPayment);
router.get('/', getUserChamas);
router.get('/:chamaId', getChama);

// Get all members
router.get('/:chamaId/members', async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0 && userId !== (await query(`SELECT created_by FROM chamas WHERE id = $1`, [chamaId])).rows[0]?.created_by) {
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
        console.error('Get members error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update member role
router.put('/:chamaId/members/:memberId/role', async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const { role } = req.body;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can update roles' });
        }

        await query(
            `UPDATE group_members SET role = $1 WHERE chama_id = $2 AND user_id = $3`,
            [role, chamaId, memberId]
        );

        res.json({ success: true, message: `Member role updated to ${role}` });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Dashboard - FIXED VERSION
router.get('/:chamaId/dashboard', async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can access dashboard' });
        }

        const stats = await query(
            `SELECT 
                (SELECT COUNT(*) FROM group_members WHERE chama_id = $1 AND is_active = true) as total_members,
                (SELECT COUNT(*) FROM meeting_minutes WHERE chama_id = $1) as total_meetings,
                (SELECT COALESCE(SUM(amount), 0) FROM member_contributions WHERE chama_id = $1) as total_contributions
            `,
            [chamaId]
        );

        res.json({
            success: true,
            data: {
                statistics: {
                    total_members: parseInt(stats.rows[0].total_members) || 0,
                    total_meetings: parseInt(stats.rows[0].total_meetings) || 0,
                    total_contributions: parseFloat(stats.rows[0].total_contributions) || 0
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
