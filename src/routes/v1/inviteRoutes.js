const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken, isChairperson } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ROLES, getRoleRequirements, hasPermission, getAllRoles } = require('../../config/roles');

// Get all available roles
router.get('/roles', async (req, res) => {
    res.json({
        success: true,
        data: {
            roles: getAllRoles(),
            role_hierarchy: {
                chairperson: 10,
                vice_chairperson: 9,
                auditor: 8,
                treasurer: 7,
                secretary: 7,
                assistant_treasurer: 6,
                assistant_secretary: 6,
                committee_member: 5,
                loan_officer: 5,
                welfare_coordinator: 4,
                member: 1
            }
        }
    });
});

// Get registration requirements for a specific role
router.get('/requirements/:role', async (req, res) => {
    try {
        const { role } = req.params;
        const requirements = getRoleRequirements(role);
        
        res.json({
            success: true,
            data: {
                role: role,
                fields: requirements.fields,
                required_fields: requirements.required,
                validations: requirements.validations,
                permissions: hasPermission(role, 'level') ? 'admin' : 'member'
            }
        });
    } catch (error) {
        console.error('Get requirements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify invite token - returns role-specific requirements
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token required' });
        }

        const result = await query(
            `SELECT i.id, i.role, i.expires_at, i.created_at, i.email_or_phone,
                    c.id as chama_id, c.name as chama_name, c.chama_type, c.plan,
                    u.full_name as invited_by_name, u.phone as invited_by_phone,
                    COALESCE(i.status, 'pending') as status
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             JOIN users u ON i.invited_by = u.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired invite' });
        }

        const invite = result.rows[0];
        const role = invite.role;
        const requirements = getRoleRequirements(role);

        const memberCount = await query(
            `SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1 AND is_active = true`,
            [invite.chama_id]
        );

        const existingRoles = await query(
            `SELECT DISTINCT role FROM group_members WHERE chama_id = $1`,
            [invite.chama_id]
        );

        res.json({
            success: true,
            data: {
                invite: {
                    id: invite.id,
                    token: token,
                    role: invite.role,
                    status: invite.status,
                    expires_at: invite.expires_at,
                    created_at: invite.created_at,
                    invited_by_email: invite.email_or_phone
                },
                chama: {
                    id: invite.chama_id,
                    name: invite.chama_name,
                    type: invite.chama_type,
                    plan: invite.plan,
                    member_count: parseInt(memberCount.rows[0].count),
                    existing_roles: existingRoles.rows.map(r => r.role)
                },
                inviter: {
                    name: invite.invited_by_name,
                    phone: invite.invited_by_phone
                },
                registration_requirements: {
                    role: role,
                    fields: requirements.fields,
                    required_fields: requirements.required,
                    validations: requirements.validations
                }
            }
        });
    } catch (error) {
        console.error('Verify invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Register via invite with role-specific validation
router.post('/register', async (req, res) => {
    try {
        const { invite_token, user_data } = req.body;

        if (!invite_token || !user_data) {
            return res.status(400).json({ success: false, message: 'Invite token and user data required' });
        }

        const inviteResult = await query(
            `SELECT i.*, c.name as chama_name, c.id as chama_id
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [invite_token]
        );

        if (inviteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired invite' });
        }

        const invite = inviteResult.rows[0];
        const role = invite.role;
        const requirements = getRoleRequirements(role);

        // Validate required fields based on role
        for (const field of requirements.required) {
            if (!user_data[field]) {
                return res.status(400).json({ 
                    success: false, 
                    message: `${field.replace(/_/g, ' ')} is required for ${role} role` 
                });
            }
        }

        // Check if user exists
        const existingUser = await query(
            `SELECT id FROM users WHERE phone = $1 OR email = $2`,
            [user_data.phone, user_data.email || null]
        );

        let userId;
        let isNewUser = false;

        if (existingUser.rows.length === 0) {
            const hashedPassword = await bcrypt.hash(user_data.password, 12);
            const randomNum = Math.floor(Math.random() * 900000) + 100000;
            const global_user_id = `USR-${randomNum}`;

            const newUser = await query(
                `INSERT INTO users (phone, full_name, password_hash, global_user_id, email, national_id, 
                                    emergency_name, emergency_phone, extra_data)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id, phone, full_name, global_user_id, email`,
                [
                    user_data.phone,
                    user_data.full_name,
                    hashedPassword,
                    global_user_id,
                    user_data.email || null,
                    user_data.national_id || null,
                    user_data.emergency_name || null,
                    user_data.emergency_phone || null,
                    JSON.stringify(user_data)
                ]
            );
            userId = newUser.rows[0].id;
            isNewUser = true;
        } else {
            userId = existingUser.rows[0].id;
        }

        // Check if already a member
        const existingMember = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [invite.chama_id, userId]
        );

        if (existingMember.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User is already a member of this chama' });
        }

        const memberCount = await query(
            `SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1`,
            [invite.chama_id]
        );
        const memberNumber = (parseInt(memberCount.rows[0].count) + 1).toString().padStart(3, '0');
        const chamaMemberId = `M-${memberNumber}`;

        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id, invited_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [invite.chama_id, userId, invite.role, chamaMemberId, invite.invited_by]
        );

        await query(`UPDATE invitations SET status = 'used' WHERE id = $1`, [invite.id]);

        const token = jwt.sign(
            { id: userId, phone: user_data.phone, full_name: user_data.full_name, role: invite.role },
            process.env.JWT_SECRET || 'chamachain-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: isNewUser ? `Successfully joined as ${invite.role}` : `Added to chama as ${invite.role}`,
            data: {
                user: {
                    id: userId,
                    phone: user_data.phone,
                    full_name: user_data.full_name,
                    email: user_data.email,
                    role: invite.role
                },
                chama: {
                    id: invite.chama_id,
                    name: invite.chama_name,
                    role: invite.role,
                    chama_member_id: chamaMemberId
                },
                token: token
            }
        });
    } catch (error) {
        console.error('Register via invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Generate invite link
router.post('/chamas/:chamaId/invite', verifyToken, isChairperson, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { role, email_or_phone, message } = req.body;
        const userId = req.user.id;

        // Validate role exists
        const validRoles = getAllRoles();
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const result = await query(
            `INSERT INTO invitations (chama_id, invited_by, role, token, email_or_phone, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, token, role, expires_at`,
            [chamaId, userId, role, token, email_or_phone, expiresAt]
        );

        const baseUrl = process.env.FRONTEND_URL || 'https://chamachain-frontend-production.up.railway.app';
        const inviteLink = `${baseUrl}/invite.html?token=${token}`;

        const inviter = await query(
            `SELECT full_name, phone, email FROM users WHERE id = $1`,
            [userId]
        );

        const chama = await query(
            `SELECT name, chama_type, plan FROM chamas WHERE id = $1`,
            [chamaId]
        );

        const requirements = getRoleRequirements(role);

        res.json({
            success: true,
            message: `Invite link generated for ${role} role`,
            data: {
                invite: {
                    id: result.rows[0].id,
                    token: result.rows[0].token,
                    role: result.rows[0].role,
                    expires_at: result.rows[0].expires_at,
                    link: inviteLink
                },
                chama: {
                    id: chamaId,
                    name: chama.rows[0].name,
                    type: chama.rows[0].chama_type,
                    plan: chama.rows[0].plan
                },
                inviter: {
                    name: inviter.rows[0].full_name,
                    phone: inviter.rows[0].phone,
                    email: inviter.rows[0].email
                },
                registration_requirements: {
                    role: role,
                    fields: requirements.fields,
                    required_fields: requirements.required,
                    validations: requirements.validations
                },
                personal_message: message || null
            }
        });
    } catch (error) {
        console.error('Generate invite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
