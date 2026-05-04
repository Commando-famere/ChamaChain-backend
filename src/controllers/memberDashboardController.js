const { query } = require('../config/database');

async function getMemberDashboard(req, res) {
    try {
        const userId = req.user.id;
        const { chamaId } = req.params;

        const memberResult = await query(
            `SELECT gm.id as member_id, gm.chama_member_id, gm.role, gm.joined_at, gm.voting_rights,
                    u.full_name, u.phone, u.email, u.global_user_id, u.profile_picture_url,
                    u.national_id, u.date_of_birth, u.gender, u.county, u.town, u.occupation,
                    u.emergency_name, u.emergency_phone
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, userId]
        );

        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }

        const member = memberResult.rows[0];

        // Get financial summary
        const balanceResult = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loans,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_repayment' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_repayments,
                COALESCE(SUM(CASE WHEN transaction_type = 'fine' THEN amount_usdt ELSE 0 END), 0) as total_fines
             FROM transaction_ledger
             WHERE member_id = $1`,
            [member.member_id]
        );

        const balance = balanceResult.rows[0];
        const currentBalance = balance.total_deposits - balance.total_withdrawals - balance.total_loans + balance.total_repayments - balance.total_fines;

        // Get recent transactions
        const transactions = await query(
            `SELECT id, transaction_type, amount_usdt, status, created_at
             FROM transaction_ledger
             WHERE member_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [member.member_id]
        );

        // Get active loans
        const loans = await query(
            `SELECT id, amount_usdt, interest_rate, repayment_weeks, weekly_installment_usdt, status, created_at
             FROM loans
             WHERE member_id = $1 AND status IN ('active', 'pending')
             ORDER BY created_at DESC`,
            [member.member_id]
        );

        // Get upcoming meetings
        const meetings = await query(
            `SELECT id, title, meeting_date, start_time, end_time, location
             FROM meeting_minutes
             WHERE chama_id = $1 AND meeting_date >= CURRENT_DATE
             ORDER BY meeting_date ASC
             LIMIT 5`,
            [chamaId]
        );

        // Get chama rules
        const chamaSettings = await query(`SELECT settings FROM chamas WHERE id = $1`, [chamaId]);
        const settings = chamaSettings.rows[0]?.settings || {};

        // Return response with member_id at the top level
        res.json({
            success: true,
            data: {
                member_id: member.member_id,  // This is the UUID needed for attendance
                profile: {
                    chama_member_id: member.chama_member_id,
                    role: member.role,
                    joined_at: member.joined_at,
                    voting_rights: member.voting_rights,
                    full_name: member.full_name,
                    phone: member.phone,
                    email: member.email,
                    global_user_id: member.global_user_id,
                    profile_picture_url: member.profile_picture_url,
                    national_id: member.national_id,
                    date_of_birth: member.date_of_birth,
                    gender: member.gender,
                    county: member.county,
                    town: member.town,
                    occupation: member.occupation,
                    emergency_name: member.emergency_name,
                    emergency_phone: member.emergency_phone
                },
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
}

module.exports = { getMemberDashboard };
