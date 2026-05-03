const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken, isChairperson } = require('../../middleware/auth');

// Generate invite link (Chairperson only)
router.post('/chamas/:chamaId/invite', verifyToken, isChairperson, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { role, email_or_phone } = req.body;
        
        const validRoles = ['member', 'treasurer', 'secretary', 'vice_chairperson', 'auditor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const result = await query(
            `INSERT INTO invitations (chama_id, invited_by, role, token, email_or_phone, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, token, role, expires_at`,
            [chamaId, req.user.id, role, token, email_or_phone, expiresAt]
        );
        
        // Use BASE_URL from environment variable
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

// Accept invite
router.post('/accept/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { phone, full_name, password, email, national_id, emergency_name, emergency_phone } = req.body;
        
        // Find invite
        const inviteResult = await query(
            `SELECT i.*, c.name as chama_name, c.approval_mode
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );
        
        if (inviteResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired invite' });
        }
        
        const invite = inviteResult.rows[0];
        
        // Check if user exists
        let user;
        const existingUser = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
        
        if (existingUser.rows.length > 0) {
            user = existingUser.rows[0];
        } else {
            const hashedPassword = await require('bcryptjs').hash(password, 12);
            const randomNum = Math.floor(Math.random() * 900000) + 100000;
            const global_user_id = `USR-${randomNum}`;
            
            const newUser = await query(
                `INSERT INTO users (phone, full_name, password_hash, global_user_id, email, national_id, emergency_name, emergency_phone)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, phone, full_name, global_user_id`,
                [phone, full_name, hashedPassword, global_user_id, email || null, national_id || null, emergency_name || null, emergency_phone || null]
            );
            user = newUser.rows[0];
        }
        
        // Check if already member
        const existingMember = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [invite.chama_id, user.id]
        );
        
        if (existingMember.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Already a member' });
        }
        
        // Add to chama
        const memberCount = await query(`SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1`, [invite.chama_id]);
        const memberNumber = (parseInt(memberCount.rows[0].count) + 1).toString().padStart(3, '0');
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id, invited_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [invite.chama_id, user.id, invite.role, chamaMemberId, invite.invited_by]
        );
        
        // Mark invite as used
        await query(`UPDATE invitations SET status = 'used' WHERE id = $1`, [invite.id]);
        
        // Generate token
        const jwt = require('jsonwebtoken');
        const authToken = jwt.sign(
            { id: user.id, phone: user.phone, full_name: user.full_name },
            process.env.JWT_SECRET || 'chamachain-secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Joined chama successfully',
            data: {
                user,
                chama: {
                    id: invite.chama_id,
                    name: invite.chama_name,
                    role: invite.role,
                    chama_member_id: chamaMemberId
                },
                token: authToken
            }
        });
    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// View pending requests (Chairperson only)
router.get('/chamas/:chamaId/pending', verifyToken, isChairperson, async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const pending = await query(
            `SELECT pm.id, pm.user_id, pm.role, pm.created_at,
                    u.full_name, u.phone, u.email
             FROM pending_members pm
             JOIN users u ON pm.user_id = u.id
             WHERE pm.chama_id = $1 AND pm.status = 'pending'`,
            [chamaId]
        );
        
        res.json({ success: true, data: pending.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve member (Chairperson only)
router.post('/chamas/:chamaId/pending/:pendingId/approve', verifyToken, isChairperson, async (req, res) => {
    try {
        const { chamaId, pendingId } = req.params;
        
        const pending = await query(
            `SELECT * FROM pending_members WHERE id = $1 AND chama_id = $2`,
            [pendingId, chamaId]
        );
        
        if (pending.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pending request not found' });
        }
        
        const memberCount = await query(`SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1`, [chamaId]);
        const memberNumber = (parseInt(memberCount.rows[0].count) + 1).toString().padStart(3, '0');
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id, invited_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [chamaId, pending.rows[0].user_id, pending.rows[0].role, chamaMemberId, pending.rows[0].invited_by]
        );
        
        await query(`UPDATE pending_members SET status = 'approved' WHERE id = $1`, [pendingId]);
        
        res.json({ success: true, message: 'Member approved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

// Verify invite token (check if valid before showing registration form)
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const result = await query(
            `SELECT i.role, i.expires_at, i.status, 
                    c.name as chama_name, c.plan as chama_plan
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired invite link',
                code: 404
            });
        }
        
        const invite = result.rows[0];
        
        res.json({
            success: true,
            message: 'Invite link is valid',
            data: {
                chama_name: invite.chama_name,
                role: invite.role,
                expires_at: invite.expires_at
            }
        });
    } catch (error) {
        console.error('Verify invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
