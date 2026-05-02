// User Model
const { query } = require('../config/database');

class UserModel {
    static async findById(id) {
        const result = await query(
            `SELECT id, phone, email, full_name, global_user_id, profile_picture_url,
                    bio, date_of_birth, gender, national_id, county, town, occupation,
                    emergency_name, emergency_phone, account_status, created_at
             FROM users WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }
    
    static async findByPhone(phone) {
        const result = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
        return result.rows[0];
    }
    
    static async findByEmail(email) {
        const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
        return result.rows[0];
    }
    
    static async create(userData) {
        const { phone, email, full_name, password_hash, global_user_id } = userData;
        const result = await query(
            `INSERT INTO users (phone, email, full_name, password_hash, global_user_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, phone, email, full_name, global_user_id, created_at`,
            [phone, email, full_name, password_hash, global_user_id]
        );
        return result.rows[0];
    }
    
    static async update(id, data) {
        const fields = [];
        const values = [];
        let idx = 1;
        
        if (data.full_name) { fields.push(`full_name = $${idx++}`); values.push(data.full_name); }
        if (data.email) { fields.push(`email = $${idx++}`); values.push(data.email); }
        if (data.bio) { fields.push(`bio = $${idx++}`); values.push(data.bio); }
        if (data.profile_picture_url) { fields.push(`profile_picture_url = $${idx++}`); values.push(data.profile_picture_url); }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const result = await query(
            `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0];
    }
}

module.exports = UserModel;
