// Member Model
const { query } = require('../config/database');

class MemberModel {
    static async addToChama(chamaId, userId, role, invitedBy) {
        // Get next member number
        const countResult = await query(
            `SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1`,
            [chamaId]
        );
        const memberNumber = (parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0');
        const chamaMemberId = `M-${memberNumber}`;
        
        const result = await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id, invited_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, role, chama_member_id, joined_at`,
            [chamaId, userId, role, chamaMemberId, invitedBy]
        );
        return result.rows[0];
    }
    
    static async getChamaMembers(chamaId) {
        const result = await query(
            `SELECT gm.id as member_id, gm.role, gm.chama_member_id, gm.joined_at,
                    u.id as user_id, u.full_name, u.phone, u.email, u.global_user_id, u.profile_picture_url
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.role = 'chairperson' DESC, gm.joined_at ASC`,
            [chamaId]
        );
        return result.rows;
    }
    
    static async updateRole(memberId, newRole) {
        const result = await query(
            `UPDATE group_members SET role = $1 WHERE id = $2 AND is_active = true RETURNING *`,
            [newRole, memberId]
        );
        return result.rows[0];
    }
    
    static async removeMember(memberId) {
        const result = await query(
            `UPDATE group_members SET is_active = false WHERE id = $1 RETURNING *`,
            [memberId]
        );
        return result.rows[0];
    }
    
    static async isMember(chamaId, userId) {
        const result = await query(
            `SELECT id, role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        return result.rows[0];
    }
}

module.exports = MemberModel;
