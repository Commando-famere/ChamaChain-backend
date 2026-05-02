const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided', code: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chamachain-secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token', code: 401 });
    }
};

// Create chama
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, plan = 'free', settings = {} } = req.body;
        const userId = req.user.id;
        
        // Create chama
        const chamaResult = await query(
            `INSERT INTO chamas (name, plan, created_by, settings)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, plan, created_at`,
            [name, plan, userId, settings]
        );
        
        const chama = chamaResult.rows[0];
        
        // Add creator as chairperson
        const memberNumber = '001';
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id, invited_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [chama.id, userId, 'chairperson', chamaMemberId, null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Chama created successfully',
            data: { chama }
        });
        
    } catch (error) {
        console.error('Create chama error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create chama',
            code: 500
        });
    }
});

// Get user's chamas
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await query(
            `SELECT c.id, c.name, c.plan, c.created_at,
                    gm.role, gm.chama_member_id, gm.joined_at
             FROM chamas c
             JOIN group_members gm ON c.id = gm.chama_id
             WHERE gm.user_id = $1 AND gm.is_active = true
             ORDER BY gm.joined_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Get chamas error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chamas',
            code: 500
        });
    }
});

module.exports = router;
