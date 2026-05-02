// Invite Model
const { query } = require('../config/database');
const crypto = require('crypto');

class InviteModel {
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static async create(chamaId, invitedBy, role, emailOrPhone) {
        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const result = await query(
            `INSERT INTO invitations (chama_id, invited_by, role, token, email_or_phone, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, token, role, expires_at`,
            [chamaId, invitedBy, role, token, emailOrPhone, expiresAt]
        );
        return result.rows[0];
    }
    
    static async findByToken(token) {
        const result = await query(
            `SELECT i.*, c.name as chama_name, c.plan as chama_plan, c.approval_mode
             FROM invitations i
             JOIN chamas c ON i.chama_id = c.id
             WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );
        return result.rows[0];
    }
    
    static async markUsed(id) {
        await query(`UPDATE invitations SET status = 'used' WHERE id = $1`, [id]);
    }
    
    static async getChamaInvites(chamaId) {
        const result = await query(
            `SELECT * FROM invitations WHERE chama_id = $1 ORDER BY created_at DESC`,
            [chamaId]
        );
        return result.rows;
    }
}

module.exports = InviteModel;
