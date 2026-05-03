const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

// Register
router.post('/register', async (req, res) => {
    try {
        const { phone, full_name, password } = req.body;
        
        // Check if user exists
        const existing = await query(`SELECT id FROM users WHERE phone = $1`, [phone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        const global_user_id = `USR-${randomNum}`;
        
        const result = await query(
            `INSERT INTO users (phone, full_name, password_hash, global_user_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, phone, full_name, global_user_id`,
            [phone, full_name, hashedPassword, global_user_id]
        );
        
        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, phone: user.phone, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({ success: true, data: { user, token } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const result = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, phone: user.phone, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    phone: user.phone,
                    full_name: user.full_name,
                    global_user_id: user.global_user_id
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
