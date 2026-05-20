const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create penalty rule
const createPenaltyRule = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { violation_type, amount, is_percentage, grace_period_days, max_penalty_per_cycle } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'treasurer'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or treasurer can set penalty rules' });
        }

        const result = await query(
            `INSERT INTO penalty_rules (chama_id, violation_type, amount, is_percentage, grace_period_days, max_penalty_per_cycle, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [chamaId, violation_type, amount, is_percentage, grace_period_days, max_penalty_per_cycle, userId]
        );

        await recordActivity(chamaId, 'penalty_rule_created', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create penalty rule error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Apply penalty to member
const applyPenalty = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { member_id, violation_type, amount, reason } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'treasurer'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or treasurer can apply penalties' });
        }

        const result = await query(
            `INSERT INTO fines (chama_id, member_id, amount_kes, reason, status, created_by)
             VALUES ($1, $2, $3, $4, 'pending', $5)
             RETURNING *`,
            [chamaId, member_id, amount, reason, userId]
        );

        await recordActivity(chamaId, 'penalty_applied', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Apply penalty error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get penalty rules
const getPenaltyRules = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const result = await query(
            `SELECT * FROM penalty_rules WHERE chama_id = $1 AND is_active = true`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get penalty rules error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createPenaltyRule, applyPenalty, getPenaltyRules };
