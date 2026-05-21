const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create welfare case
const createWelfareCase = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { member_id, case_type, description, amount_usdt } = req.body;
        const userId = req.user.id;

        // Check if user is chairperson or welfare_officer
        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'welfare_officer'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or welfare officer can create welfare cases' });
        }

        const result = await query(
            `INSERT INTO welfare_cases (chama_id, member_id, welfare_officer_id, case_type, description, amount_usdt, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'open')
             RETURNING *`,
            [chamaId, member_id, userId, case_type, description, amount_usdt]
        );

        await recordActivity(chamaId, 'welfare_case_created', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create welfare case error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Close welfare case
const closeWelfareCase = async (req, res) => {
    try {
        const { chamaId, caseId } = req.params;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'welfare_officer'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or welfare officer can close welfare cases' });
        }

        await query(
            `UPDATE welfare_cases SET status = 'closed', closed_at = NOW() WHERE id = $1 AND chama_id = $2`,
            [caseId, chamaId]
        );

        await recordActivity(chamaId, 'welfare_case_closed', userId);
        res.json({ success: true, message: 'Welfare case closed' });
    } catch (error) {
        console.error('Close welfare case error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all welfare cases for a chama
const getWelfareCases = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const result = await query(
            `SELECT w.*, u.full_name as member_name, o.full_name as officer_name
             FROM welfare_cases w
             JOIN users u ON w.member_id = u.id
             LEFT JOIN users o ON w.welfare_officer_id = o.id
             WHERE w.chama_id = $1
             ORDER BY w.created_at DESC`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get welfare cases error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createWelfareCase, closeWelfareCase, getWelfareCases };
