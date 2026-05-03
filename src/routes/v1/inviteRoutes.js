const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken, isChairperson } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============ PUBLIC ENDPOINTS ============

// Verify invite token
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ success: false, message: 'Token required' });
        }
        
        const result = await query(
            `SELECT i.role, i.expires_at, c.id as chama_id, c.name as chama_name
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired invite' });
        }
        
        const invite = result.rows[0];
        
        res.json({
            success: true,
            data: {
                role: invite.role,
                chama_info: {
                    id: invite.chama_id,
                    name: invite.chama_name
                },
                expires_at: invite.expires_at
            }
        });
    } catch (error) {
        console.error('Verify invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Register via invite
router.post('/register', async (req, res) => {
    try {
        const { invite_token, user_data } = req.body;
        
        if (!invite_token || !user_data) {
            return res.status(400).json({ success: false, message: 'Invite token and user data required' });
        }
        
        const inviteResult = await query(
            `SELECT i.*, c.name as chama_name
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [invite_token]
        );
        
        if (inviteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired invite' });
        }
        
        const invite = inviteResult.rows[0];
        
        const existingUser = await query(
            `SELECT id FROM users WHERE phone = $1 OR email = $2`,
            [user_data.phone, user_data.email || null]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(user_data.password, 12);
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        const global_user_id = `USR-${randomNum}`;
        
        const newUser = await query(
            `INSERT INTO users (phone, full_name, password_hash, global_user_id, email, national_id, emergency_name, emergency_phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, phone, full_name, global_user_id`,
            [
                user_data.phone,
                user_data.full_name,
                hashedPassword,
                global_user_id,
                user_data.email || null,
                user_data.national_id || null,
                user_data.emergency_name || null,
                user_data.emergency_phone || null
            ]
        );
        
        const user = newUser.rows[0];
        
        const memberCount = await query(`SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1`, [invite.chama_id]);
        const memberNumber = (parseInt(memberCount.rows[0].count) + 1).toString().padStart(3, '0');
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id, invited_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [invite.chama_id, user.id, invite.role, chamaMemberId, invite.invited_by]
        );
        
        await query(`UPDATE invitations SET status = 'used' WHERE id = $1`, [invite.id]);
        
        const token = jwt.sign(
            { id: user.id, phone: user.phone, full_name: user.full_name },
            process.env.JWT_SECRET || 'chamachain-secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Registration successful',
            data: {
                user,
                chama: {
                    id: invite.chama_id,
                    name: invite.chama_name,
                    role: invite.role,
                    chama_member_id: chamaMemberId
                },
                token
            }
        });
    } catch (error) {
        console.error('Register via invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ PROTECTED ENDPOINTS ============

// Generate invite link
router.post('/chamas/:chamaId/invite', verifyToken, isChairperson, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { role, email_or_phone } = req.body;
        
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const result = await query(
            `INSERT INTO invitations (chama_id, invited_by, role, token, email_or_phone, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, token, role, expires_at`,
            [chamaId, req.user.id, role, token, email_or_phone, expiresAt]
        );
        
        const baseUrl = process.env.BASE_URL || 'https://marvelous-nourishment-production-fef4.up.railway.app';
        const inviteLink = `${baseUrl}/invite?token=${token}`;
        
        res.json({
            success: true,
            data: {
                invite_id: result.rows[0].id,
                token: result.rows[0].token,
                role: result.rows[0].role,
                invite_link: inviteLink,
                expires_at: result.rows[0].expires_at
            }
        });
    } catch (error) {
        console.error('Generate invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
