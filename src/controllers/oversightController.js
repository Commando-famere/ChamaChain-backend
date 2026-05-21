const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Request audit
const requestAudit = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { audit_type, reason } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (roleCheck.rows[0]?.role !== 'chairperson') {
            return res.status(403).json({ success: false, message: 'Only chairperson can request audits' });
        }

        // Create audit request table if needed
        await query(`
            CREATE TABLE IF NOT EXISTS chama_audits (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
                requested_by UUID REFERENCES users(id),
                audit_type VARCHAR(50),
                reason TEXT,
                status VARCHAR(30) DEFAULT 'pending',
                report TEXT,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        const result = await query(
            `INSERT INTO chama_audits (chama_id, requested_by, audit_type, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [chamaId, userId, audit_type, reason]
        );

        await recordActivity(chamaId, 'audit_requested', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Request audit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get oversight dashboard
const getOversightDashboard = async (req, res) => {
    try {
        const { chamaId } = req.params;

        // Get recent minutes
        const minutes = await query(
            `SELECT id, title, meeting_date, created_at 
             FROM meeting_minutes 
             WHERE chama_id = $1 
             ORDER BY meeting_date DESC LIMIT 5`,
            [chamaId]
        );

        // Get recent transactions
        const transactions = await query(
            `SELECT id, transaction_type, amount_usdt, status, created_at 
             FROM transaction_ledger 
             WHERE chama_id = $1 
             ORDER BY created_at DESC LIMIT 10`,
            [chamaId]
        );

        // Get pending approvals
        const approvals = await query(
            `SELECT wa.id, wa.amount_kes, wa.status, u.full_name
             FROM withdrawal_approvals wa
             JOIN withdrawal_signatures ws ON wa.id = ws.approval_id
             JOIN users u ON wa.member_id = u.id
             WHERE wa.chama_id = $1 AND wa.status = 'pending'
             GROUP BY wa.id, u.full_name`,
            [chamaId]
        );

        res.json({
            success: true,
            data: {
                recent_minutes: minutes.rows,
                recent_transactions: transactions.rows,
                pending_approvals: approvals.rows
            }
        });
    } catch (error) {
        console.error('Get oversight dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { requestAudit, getOversightDashboard };
