const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken } = require('../../middleware/auth');

// Get current member's ID for a chama
router.get('/current/:chamaId', verifyToken, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        const result = await query(
            `SELECT id as member_id, chama_member_id, role
             FROM group_members
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
