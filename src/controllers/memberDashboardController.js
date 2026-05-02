const { query } = require('../config/database');

async function getMemberDashboard(req, res) {
    try {
        const userId = req.user.id;
        const { chamaId } = req.params;
        
        // Get member details
        const memberResult = await query(
            `SELECT gm.id as member_id, gm.role, gm.chama_member_id, gm.joined_at,
                    gm.regular_contribution_amount, gm.regular_contribution_frequency,
                    gm.payment_method, gm.voting_rights, gm.shareholding_amount,
                    u.full_name, u.phone, u.email, u.global_user_id, u.profile_picture_url,
                    u.bio, u.date_of_birth, u.county, u.town, u.occupation
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member', code: 403 });
        }
        
        const member = memberResult.rows[0];
        
        // Get financial summary
        const balanceResult = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' THEN amount_usdt ELSE 0 END), 0) as total_loans,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_repayment' THEN amount_usdt ELSE 0 END), 0) as total_repayments,
                COALESCE(SUM(CASE WHEN transaction_type = 'fine' THEN amount_usdt ELSE 0 END), 0) as total_fines
             FROM transaction_ledger
             WHERE member_id = $1 AND status = 'approved'`,
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
        const activeLoans = await query(
            `SELECT id, amount_usdt, interest_rate, repayment_weeks, weekly_installment_usdt, status, created_at
             FROM loans
             WHERE member_id = $1 AND status IN ('pending', 'active')
             ORDER BY created_at DESC`,
            [member.member_id]
        );
        
        // Get upcoming contributions
        const contribution = {
            amount: member.regular_contribution_amount || 0,
            frequency: member.regular_contribution_frequency || 'monthly',
            next_due: getNextDueDate(member.regular_contribution_frequency)
        };
        
        // Get recent meetings
        const meetings = await query(
            `SELECT id, title, meeting_date, location
             FROM meeting_minutes
             WHERE chama_id = $1
             ORDER BY meeting_date DESC
             LIMIT 5`,
            [chamaId]
        );
        
        // Get payout history
        const payouts = await query(
            `SELECT id, amount_usdt, status, created_at, approved_at
             FROM transaction_ledger
             WHERE member_id = $1 AND transaction_type = 'withdrawal'
             ORDER BY created_at DESC
             LIMIT 10`,
            [member.member_id]
        );
        
        // Get chama rolling settings
        const chamaSettings = await query(
            `SELECT settings FROM chamas WHERE id = $1`,
            [chamaId]
        );
        
        const settings = chamaSettings.rows[0]?.settings || {};
        
        res.json({
            success: true,
            data: {
                profile: {
                    member_id: member.chama_member_id,
                    role: member.role,
                    full_name: member.full_name,
                    phone: member.phone,
                    email: member.email,
                    global_user_id: member.global_user_id,
                    profile_picture_url: member.profile_picture_url,
                    joined_at: member.joined_at,
                    voting_rights: member.voting_rights,
                    shareholding_amount: member.shareholding_amount
                },
                financial: {
                    total_deposits: parseFloat(balance.total_deposits),
                    total_withdrawals: parseFloat(balance.total_withdrawals),
                    total_loans: parseFloat(balance.total_loans),
                    total_repayments: parseFloat(balance.total_repayments),
                    total_fines: parseFloat(balance.total_fines),
                    current_balance: currentBalance,
                    next_contribution: contribution
                },
                recent_transactions: transactions.rows,
                active_loans: activeLoans.rows,
                payout_history: payouts.rows,
                recent_meetings: meetings.rows,
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
        res.status(500).json({ success: false, message: 'Failed to load dashboard', code: 500 });
    }
}

function getNextDueDate(frequency) {
    const date = new Date();
    switch(frequency) {
        case 'daily': date.setDate(date.getDate() + 1); break;
        case 'weekly': date.setDate(date.getDate() + 7); break;
        case 'monthly': date.setMonth(date.getMonth() + 1); break;
        default: date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString();
}

async function getPayoutHistory(req, res) {
    try {
        const userId = req.user.id;
        const { chamaId } = req.params;
        
        const memberResult = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member', code: 403 });
        }
        
        const payouts = await query(
            `SELECT id, amount_usdt, status, created_at, approved_at
             FROM transaction_ledger
             WHERE member_id = $1 AND transaction_type = 'withdrawal'
             ORDER BY created_at DESC`,
            [memberResult.rows[0].id]
        );
        
        res.json({ success: true, data: payouts.rows });
        
    } catch (error) {
        console.error('Payout history error:', error);
        res.status(500).json({ success: false, message: 'Failed to get payouts', code: 500 });
    }
}

module.exports = { getMemberDashboard, getPayoutHistory };
