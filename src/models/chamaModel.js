// Chama Model
const { query } = require('../config/database');

class ChamaModel {
    static async create(data) {
        const { name, plan, created_by, settings } = data;
        const result = await query(
            `INSERT INTO chamas (name, plan, created_by, settings)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name, plan, created_by, settings || {}]
        );
        return result.rows[0];
    }
    
    static async findById(id) {
        const result = await query(`SELECT * FROM chamas WHERE id = $1`, [id]);
        return result.rows[0];
    }
    
    static async update(id, data) {
        const { name, settings } = data;
        const result = await query(
            `UPDATE chamas SET name = COALESCE($1, name), settings = COALESCE($2, settings), updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [name, settings, id]
        );
        return result.rows[0];
    }
    
    static async updatePlan(id, plan) {
        const result = await query(
            `UPDATE chamas SET plan = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [plan, id]
        );
        return result.rows[0];
    }
    
    static async getUserChamas(userId) {
        const result = await query(
            `SELECT c.*, gm.role, gm.chama_member_id, gm.joined_at
             FROM chamas c
             JOIN group_members gm ON c.id = gm.chama_id
             WHERE gm.user_id = $1 AND gm.is_active = true
             ORDER BY gm.joined_at DESC`,
            [userId]
        );
        return result.rows;
    }
}

module.exports = ChamaModel;
