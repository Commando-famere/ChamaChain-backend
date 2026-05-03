const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Create chama
router.post('/', verifyToken, async (req, res) => {
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

// Get chamas
router.get('/', verifyToken, async (req, res) => {
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

module.exports = router;
