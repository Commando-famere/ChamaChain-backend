const { query } = require('../config/database');

async function getChairpersonDashboard(req, res) {
    try {
        const userId = req.user.id;
        const { chamaId } = req.params;
        
        // Verify chairperson
        const roleCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );
        
        if (roleCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson', code: 403 });
        }
        
        // Get all members with details
        const members = await query(
            `SELECT gm.id, gm.chama_member_id, gm.role, gm.joined_at,
                    gm.regular_contribution_amount, gm.voting_rights,
                    u.full_name, u.phone, u.email, u.profile_picture_url
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.role = 'chairperson' DESC, gm.joined_at ASC`,
            [chamaId]
        );
        
        // Get pending member approvals
        const pendingApprovals = await query(
            `SELECT pm.id, pm.role, pm.created_at,
                    u.full_name, u.phone, u.email
             FROM pending_members pm
             JOIN users u ON pm.user_id = u.id
             WHERE pm.chama_id = $1 AND pm.status = 'pending'
             ORDER BY pm.created_at ASC`,
            [chamaId]
        );
        
        // Get pending transaction approvals
        const pendingTransactions = await query(
            `SELECT tl.id, tl.transaction_type, tl.amount_usdt, tl.created_at,
                    u.full_name as member_name, gm.chama_member_id
             FROM transaction_ledger tl
             JOIN group_members gm ON tl.member_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE tl.chama_id = $1 AND tl.status = 'pending'
             ORDER BY tl.created_at ASC`,
            [chamaId]
        );
        
        // Get pending loan approvals
        const pendingLoans = await query(
            `SELECT l.id, l.amount_usdt, l.interest_rate, l.repayment_weeks, l.created_at,
                    u.full_name as member_name, gm.chama_member_id
             FROM loans l
             JOIN group_members gm ON l.member_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE l.chama_id = $1 AND l.status = 'pending'
             ORDER BY l.created_at ASC`,
            [chamaId]
        );
        
        // Get financial summary
        const financialSummary = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loans_disbursed,
                COALESCE(SUM(CASE WHEN transaction_type = 'fine' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_fines
             FROM transaction_ledger
             WHERE chama_id = $1`,
            [chamaId]
        );
        
        const summary = financialSummary.rows[0];
        const currentBalance = summary.total_deposits - summary.total_withdrawals - summary.total_loans_disbursed + summary.total_fines;
        
        // Get recent activities
        const recentActivities = await query(
            `(SELECT 'meeting' as type, title as description, meeting_date as event_date
             FROM meeting_minutes
             WHERE chama_id = $1)
             UNION ALL
             (SELECT 'member_joined' as type, u.full_name as description, gm.joined_at as event_date
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true)
             ORDER BY event_date DESC
             LIMIT 20`,
            [chamaId]
        );
        
        res.json({
            success: true,
            data: {
                members: members.rows,
                pending_approvals: pendingApprovals.rows,
                pending_transactions: pendingTransactions.rows,
                pending_loans: pendingLoans.rows,
                financial_summary: {
                    total_deposits: parseFloat(summary.total_deposits),
                    total_withdrawals: parseFloat(summary.total_withdrawals),
                    total_loans_disbursed: parseFloat(summary.total_loans_disbursed),
                    total_fines: parseFloat(summary.total_fines),
                    current_balance: currentBalance,
                    total_members: members.rows.length
                },
                recent_activities: recentActivities.rows
            }
        });
        
    } catch (error) {
        console.error('Chairperson dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to load dashboard', code: 500 });
    }
}

// Update chama rolling settings
async function updateChamaRollingSettings(req, res) {
    try {
        const userId = req.user.id;
        const { chamaId } = req.params;
        const settings = req.body;
        
        const roleCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );
        
        if (roleCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson', code: 403 });
        }
        
        // Get current settings
        const current = await query(`SELECT settings FROM chamas WHERE id = $1`, [chamaId]);
        const currentSettings = current.rows[0]?.settings || {};
        
        // Merge new settings
        const newSettings = { ...currentSettings, ...settings };
        
        await query(
            `UPDATE chamas SET settings = $1 WHERE id = $2`,
            [newSettings, chamaId]
        );
        
        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: newSettings
        });
        
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings', code: 500 });
    }
}

async function getChamaRollingSettings(req, res) {
    try {
        const { chamaId } = req.params;
        
        const result = await query(`SELECT settings FROM chamas WHERE id = $1`, [chamaId]);
        const settings = result.rows[0]?.settings || {};
        
        res.json({
            success: true,
            data: {
                contribution_amount: settings.contribution_amount || 0,
                contribution_frequency: settings.contribution_frequency || 'monthly',
                contribution_custom_days: settings.contribution_custom_days || null,
                currency: settings.currency || 'KES',
                fine_amount: settings.fine_amount || 50,
                late_payment_grace_days: settings.late_payment_grace_days || 3,
                meeting_days: settings.meeting_days || 'Saturday',
                meeting_time: settings.meeting_time || '15:00',
                meeting_venue: settings.meeting_venue || 'Online',
                loan_interest_rate: settings.loan_interest_rate || 5,
                max_loan_limit: settings.max_loan_limit || 50000,
                withdrawal_notice_days: settings.withdrawal_notice_days || 7,
                savings_goal: settings.savings_goal || null,
                description: settings.description || null,
                location: settings.location || null
            }
        });
        
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to get settings', code: 500 });
    }
}

module.exports = { getChairpersonDashboard, getChamaRollingSettings, updateChamaRollingSettings };
