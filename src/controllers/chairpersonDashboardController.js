const { query } = require('../config/database');

const getChairpersonDashboard = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        // Verify user is chairperson
        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return sendError(res, 'Only chairperson can access dashboard', 403, 403);
        }

        // Get chama details
        const chama = await query(
            `SELECT id, name, chama_type, plan, created_at, is_active 
             FROM chamas WHERE id = $1`,
            [chamaId]
        );

        // Get statistics
        const stats = await query(
            `SELECT 
                (SELECT COUNT(*) FROM group_members WHERE chama_id = $1 AND is_active = true) as total_members,
                (SELECT COUNT(*) FROM meeting_minutes WHERE chama_id = $1) as total_meetings,
                (SELECT COUNT(*) FROM transaction_ledger WHERE chama_id = $1 AND status = 'completed') as total_transactions,
                (SELECT COALESCE(SUM(amount), 0) FROM member_contributions WHERE chama_id = $1) as total_contributions,
                (SELECT COUNT(*) FROM withdrawal_approvals WHERE chama_id = $1 AND status = 'pending') as pending_withdrawals,
                (SELECT COUNT(*) FROM loans WHERE chama_id = $1 AND status = 'pending') as pending_loans,
                (SELECT COUNT(*) FROM member_join_requests WHERE chama_id = $1 AND status = 'pending') as pending_members,
                (SELECT COUNT(*) FROM chama_disputes WHERE chama_id = $1 AND status = 'pending') as active_disputes
            `,
            [chamaId]
        );

        // Get recent activities
        const recentActivities = await query(
            `SELECT activity_type, description, created_at
             FROM chama_activity_log
             WHERE chama_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [chamaId]
        );

        // Get upcoming meetings
        const upcomingMeetings = await query(
            `SELECT id, title, meeting_date, start_time, location
             FROM meeting_minutes
             WHERE chama_id = $1 AND meeting_date >= CURRENT_DATE
             ORDER BY meeting_date ASC
             LIMIT 5`,
            [chamaId]
        );

        // Get recent members
        const recentMembers = await query(
            `SELECT u.id, u.full_name, u.phone, gm.role, gm.joined_at
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.joined_at DESC
             LIMIT 10`,
            [chamaId]
        );

        // Get financial summary
        const financial = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' THEN amount_usdt ELSE 0 END), 0) as total_loans_disbursed,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_repayment' THEN amount_usdt ELSE 0 END), 0) as total_loan_repayments
            FROM transaction_ledger
            WHERE chama_id = $1 AND status = 'completed'`,
            [chamaId]
        );

        const currentBalance = (financial.rows[0].total_deposits || 0) - 
                               (financial.rows[0].total_withdrawals || 0) - 
                               (financial.rows[0].total_loans_disbursed || 0) + 
                               (financial.rows[0].total_loan_repayments || 0);

        res.json({
            success: true,
            data: {
                chama: chama.rows[0],
                statistics: {
                    total_members: parseInt(stats.rows[0].total_members) || 0,
                    total_meetings: parseInt(stats.rows[0].total_meetings) || 0,
                    total_transactions: parseInt(stats.rows[0].total_transactions) || 0,
                    total_contributions: parseFloat(stats.rows[0].total_contributions) || 0,
                    pending_withdrawals: parseInt(stats.rows[0].pending_withdrawals) || 0,
                    pending_loans: parseInt(stats.rows[0].pending_loans) || 0,
                    pending_members: parseInt(stats.rows[0].pending_members) || 0,
                    active_disputes: parseInt(stats.rows[0].active_disputes) || 0,
                    current_balance: currentBalance
                },
                recent_activities: recentActivities.rows,
                upcoming_meetings: upcomingMeetings.rows,
                recent_members: recentMembers.rows
            }
        });
    } catch (error) {
        console.error('Get chairperson dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getChairpersonDashboard };
