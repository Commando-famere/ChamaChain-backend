const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

// Complete Registration with all fields
router.post('/register', async (req, res) => {
    try {
        const {
            phone,
            full_name,
            password,
            email,
            national_id,
            emergency_name,
            emergency_phone,
            date_of_birth,
            gender,
            county,
            town,
            occupation
        } = req.body;
        
        // Validate required fields
        if (!phone || !full_name || !password || !national_id || !emergency_name || !emergency_phone) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: phone, full_name, password, national_id, emergency_name, emergency_phone'
            });
        }
        
        // Check if user exists
        const existing = await query(
            `SELECT id FROM users WHERE phone = $1 OR email = $2 OR national_id = $3`,
            [phone, email || null, national_id]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        const global_user_id = `USR-${randomNum}`;
        
        const result = await query(
            `INSERT INTO users (
                phone, email, full_name, password_hash, global_user_id,
                national_id, emergency_name, emergency_phone,
                date_of_birth, gender, county, town, occupation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, phone, email, full_name, global_user_id, national_id`,
            [
                phone, email || null, full_name, hashedPassword, global_user_id,
                national_id, emergency_name, emergency_phone,
                date_of_birth || null, gender || null, county || null, town || null, occupation || null
            ]
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
                    email: user.email,
                    full_name: user.full_name,
                    global_user_id: user.global_user_id,
                    national_id: user.national_id,
                    profile_picture_url: user.profile_picture_url
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
