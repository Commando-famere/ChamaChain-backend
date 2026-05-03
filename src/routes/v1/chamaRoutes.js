const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken, isChairperson, isMemberOfChama } = require('../../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Get user's own chamas (only the logged-in user's chamas)
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await query(
            `SELECT c.id, c.name, c.plan, gm.role, gm.chama_member_id
             FROM chamas c
             JOIN group_members gm ON c.id = gm.chama_id
             WHERE gm.user_id = $1 AND gm.is_active = true`,
            [userId]
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get chamas error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create chama (auto-assigns current user as chairperson)
router.post('/', async (req, res) => {
    try {
        const { name, plan = 'free' } = req.body;
        const userId = req.user.id;
        
        const result = await query(
            `INSERT INTO chamas (name, plan, created_by)
             VALUES ($1, $2, $3)
             RETURNING id, name, plan`,
            [name, plan, userId]
        );
        
        const chama = result.rows[0];
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, 'chairperson', 'M-001')`,
            [chama.id, userId]
        );
        
        res.json({ success: true, data: chama });
    } catch (error) {
        console.error('Create chama error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get specific chama (must be member)
router.get('/:chamaId', isMemberOfChama, async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const result = await query(
            `SELECT id, name, plan, created_at FROM chamas WHERE id = $1`,
            [chamaId]
        );
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update chama (chairperson only)
router.put('/:chamaId', isChairperson, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { name } = req.body;
        
        await query(`UPDATE chamas SET name = $1 WHERE id = $2`, [name, chamaId]);
        
        res.json({ success: true, message: 'Chama updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
