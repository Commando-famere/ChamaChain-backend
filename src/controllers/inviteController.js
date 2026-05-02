const crypto = require('crypto');
const { query } = require('../config/database');

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function generateInviteLink(req, res) {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { role, email_or_phone } = req.body;
        
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const result = await query(
            `INSERT INTO invitations (chama_id, invited_by, role, token, email_or_phone, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, token, role, expires_at`,
            [chamaId, userId, role, token, email_or_phone || null, expiresAt]
        );
        
        const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
        const inviteLink = `${baseUrl}/invite?token=${token}`;
        
        res.json({
            success: true,
            message: 'Invite link generated successfully',
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
        res.status(500).json({
            success: false,
            message: 'Failed to generate invite',
            code: 500
        });
    }
}

async function acceptInvite(req, res) {
    try {
        const { token } = req.params;
        const { phone, full_name, password } = req.body;
        
        // Find invite
        const inviteResult = await query(
            `SELECT i.*, c.name as chama_name 
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );
        
        if (inviteResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired invite link',
                code: 400
            });
        }
        
        const invite = inviteResult.rows[0];
        
        // Check if user exists
        let user;
        const existingUser = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
        
        if (existingUser.rows.length > 0) {
            user = existingUser.rows[0];
        } else {
            // Create new user
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 12);
            const randomNum = Math.floor(Math.random() * 900000) + 100000;
            const global_user_id = `USR-${randomNum}`;
            
            const newUser = await query(
                `INSERT INTO users (phone, full_name, password_hash, global_user_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, phone, full_name, global_user_id`,
                [phone, full_name, hashedPassword, global_user_id]
            );
            user = newUser.rows[0];
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
                }
            }
        });
        
    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept invite',
            code: 500
        });
    }
}

module.exports = { generateInviteLink, acceptInvite };

// Reject/decline invite
async function rejectInvite(req, res) {
    try {
        const { token } = req.params;
        
        // Find invite
        const inviteResult = await query(
            `SELECT id FROM invitations 
             WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
            [token]
        );
        
        if (inviteResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired invite link',
                code: 400
            });
        }
        
        // Mark invite as rejected/expired
        await query(
            `UPDATE invitations SET status = 'expired' WHERE id = $1`,
            [inviteResult.rows[0].id]
        );
        
        res.json({
            success: true,
            message: 'Invite declined successfully'
        });
        
    } catch (error) {
        console.error('Reject invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to decline invite',
            code: 500
        });
    }
}

module.exports = { generateInviteLink, acceptInvite, rejectInvite };

// Chairperson approves pending member
async function approveMember(req, res) {
    try {
        const { chamaId, pendingId } = req.params;
        const userId = req.user.id;
        
        // Verify user is chairperson
        const roleCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson'`,
            [chamaId, userId]
        );
        
        if (roleCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Only chairperson can approve members',
                code: 403
            });
        }
        
        // Get pending member
        const pending = await query(
            `SELECT * FROM pending_members WHERE id = $1 AND chama_id = $2 AND status = 'pending'`,
            [pendingId, chamaId]
        );
        
        if (pending.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pending request not found',
                code: 404
            });
        }
        
        // Add to group_members
        const memberCount = await query(`SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1`, [chamaId]);
        const memberNumber = (parseInt(memberCount.rows[0].count) + 1).toString().padStart(3, '0');
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, $3, $4)`,
            [chamaId, pending.rows[0].user_id, pending.rows[0].role, chamaMemberId]
        );
        
        // Update pending status
        await query(
            `UPDATE pending_members SET status = 'approved', approved_at = NOW(), approved_by = $1
             WHERE id = $2`,
            [userId, pendingId]
        );
        
        res.json({
            success: true,
            message: 'Member approved successfully'
        });
        
    } catch (error) {
        console.error('Approve member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve member',
            code: 500
        });
    }
}

// Chairperson rejects pending member
async function rejectMember(req, res) {
    try {
        const { chamaId, pendingId } = req.params;
        const userId = req.user.id;
        
        // Verify user is chairperson
        const roleCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson'`,
            [chamaId, userId]
        );
        
        if (roleCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Only chairperson can reject members',
                code: 403
            });
        }
        
        await query(
            `UPDATE pending_members SET status = 'rejected', approved_at = NOW(), approved_by = $1
             WHERE id = $2 AND chama_id = $3`,
            [userId, pendingId, chamaId]
        );
        
        res.json({
            success: true,
            message: 'Member request rejected'
        });
        
    } catch (error) {
        console.error('Reject member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject member',
            code: 500
        });
    }
}

module.exports = { generateInviteLink, acceptInvite, rejectInvite, approveMember, rejectMember };
