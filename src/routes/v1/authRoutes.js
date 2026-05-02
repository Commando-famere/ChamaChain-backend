const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { generateToken } = require('../../middleware/auth');
const { createSession, invalidateSession } = require('../../middleware/sessionMiddleware');

// Register
router.post('/register', async (req, res) => {
    try {
        const { phone, email, full_name, password } = req.body;
        
        const existing = await query(
            `SELECT id FROM users WHERE phone = $1 OR email = $2`,
            [phone, email || null]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
                code: 409
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        const global_user_id = `USR-${randomNum}`;
        
        const result = await query(
            `INSERT INTO users (phone, email, full_name, password_hash, global_user_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, phone, email, full_name, global_user_id, created_at`,
            [phone, email || null, full_name, hashedPassword, global_user_id]
        );
        
        const user = result.rows[0];
        const token = generateToken(user);
        
        // Create session
        await createSession(user.id, token);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token, session_expires_in: 300 }
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            code: 500
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { phone, email, password } = req.body;
        
        let user;
        if (phone) {
            const result = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
            user = result.rows[0];
        } else if (email) {
            const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
            user = result.rows[0];
        }
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                code: 401
            });
        }
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                code: 401
            });
        }
        
        const token = generateToken(user);
        
        // Create session
        await createSession(user.id, token);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    phone: user.phone,
                    email: user.email,
                    full_name: user.full_name,
                    global_user_id: user.global_user_id
                },
                token,
                session_expires_in: 300
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            code: 500
        });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            await invalidateSession(token);
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            code: 500
        });
    }
});

// Profile
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token', code: 401 });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chamachain-secret');
        
        const result = await query(
            `SELECT id, phone, email, full_name, global_user_id, created_at
             FROM users WHERE id = $1`,
            [decoded.id]
        );
        
        res.json({ success: true, data: { user: result.rows[0] } });
        
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token', code: 401 });
    }
});

module.exports = router;
