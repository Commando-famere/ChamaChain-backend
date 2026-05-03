const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const { verifyToken, isMemberOfChama } = require('../../middleware/auth');

router.use(verifyToken);

// Complete Member Dashboard
router.get('/member/:chamaId', isMemberOfChama, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        // 1. Get Member Profile
        const member = await query(
            `SELECT gm.chama_member_id, gm.role, gm.joined_at, gm.voting_rights,
                    u.full_name, u.phone, u.email, u.global_user_id, u.profile_picture_url,
                    u.national_id, u.date_of_birth, u.gender, u.county, u.town, u.occupation,
                    u.emergency_name, u.emergency_phone
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, userId]
        );
        
        // 2. Get Financial Summary
        const financial = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loans,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_repayment' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_repayments,
                COALESCE(SUM(CASE WHEN transaction_type = 'fine' THEN amount_usdt ELSE 0 END), 0) as total_fines
             FROM transaction_ledger
             WHERE member_id = (SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2)`,
            [chamaId, userId]
        );
        
        const balance = financial.rows[0];
        const currentBalance = balance.total_deposits - balance.total_withdrawals - balance.total_loans + balance.total_repayments - balance.total_fines;
        
        // 3. Get Recent Transactions
        const transactions = await query(
            `SELECT id, transaction_type, amount_usdt, status, created_at
             FROM transaction_ledger
             WHERE member_id = (SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2)
             ORDER BY created_at DESC
             LIMIT 10`,
            [chamaId, userId]
        );
        
        // 4. Get Active Loans
        const loans = await query(
            `SELECT id, amount_usdt, interest_rate, repayment_weeks, weekly_installment_usdt, status, created_at
             FROM loans
             WHERE member_id = (SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2)
             AND status IN ('active', 'pending')
             ORDER BY created_at DESC`,
            [chamaId, userId]
        );
        
        // 5. Get Upcoming Meetings
        const meetings = await query(
            `SELECT id, title, meeting_date, start_time, end_time, location
             FROM meeting_minutes
             WHERE chama_id = $1 AND meeting_date >= CURRENT_DATE
             ORDER BY meeting_date ASC
             LIMIT 5`,
            [chamaId]
        );
        
        // 6. Get Chama Rules (from settings)
        const chamaSettings = await query(`SELECT settings FROM chamas WHERE id = $1`, [chamaId]);
        const settings = chamaSettings.rows[0]?.settings || {};
        
        res.json({
            success: true,
            data: {
                profile: member.rows[0],
                financial: {
                    total_deposits: parseFloat(balance.total_deposits),
                    total_withdrawals: parseFloat(balance.total_withdrawals),
                    total_loans: parseFloat(balance.total_loans),
                    total_repayments: parseFloat(balance.total_repayments),
                    total_fines: parseFloat(balance.total_fines),
                    current_balance: currentBalance,
                    next_contribution: {
                        amount: settings.contribution_amount || 0,
                        frequency: settings.contribution_frequency || 'monthly'
                    }
                },
                recent_transactions: transactions.rows,
                active_loans: loans.rows,
                upcoming_meetings: meetings.rows,
                chama_rules: {
                    contribution_amount: settings.contribution_amount || 0,
                    contribution_frequency: settings.contribution_frequency || 'monthly',
                    fine_amount: settings.fine_amount || 50,
                    late_payment_grace_days: settings.late_payment_grace_days || 3,
                    meeting_days: settings.meeting_days || 'Saturday',
                    meeting_time: settings.meeting_time || '15:00',
                    meeting_venue: settings.meeting_venue || 'Online',
                    loan_interest_rate: settings.loan_interest_rate || 5,
                    withdrawal_notice_days: settings.withdrawal_notice_days || 7
                }
            }
        });
        
    } catch (error) {
        console.error('Member dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
