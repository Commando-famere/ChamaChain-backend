const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken, isMemberOfChama } = require('../../middleware/auth');

router.use(verifyToken);

// Member dashboard (must be member of the chama)
router.get('/member/:chamaId', isMemberOfChama, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        // Get member details
        const member = await query(
            `SELECT gm.chama_member_id, gm.role, gm.joined_at,
                    u.full_name, u.phone, u.email
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, userId]
        );
        
        res.json({ success: true, data: { profile: member.rows[0] } });
    } catch (error) {
        console.error('Member dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Chairperson dashboard (must be chairperson)
router.get('/chairperson/:chamaId', isMemberOfChama, async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        // Check if user is chairperson
        if (req.memberRole !== 'chairperson') {
            return res.status(403).json({
                success: false,
                message: 'Only chairperson can access this dashboard',
                code: 403
            });
        }
        
        const members = await query(
            `SELECT gm.chama_member_id, gm.role, u.full_name, u.phone
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true`,
            [chamaId]
        );
        
        res.json({ success: true, data: { members: members.rows } });
    } catch (error) {
        console.error('Chairperson dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
