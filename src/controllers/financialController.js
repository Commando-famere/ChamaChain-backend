const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Record deposit
const recordDeposit = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { member_id, amount, payment_method, transaction_reference } = req.body;
        
        const roleCheck = await query(
            `SELECT id, role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('chairperson', 'treasurer')`,
            [chamaId, userId]
        );
        
        if (roleCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson or treasurer can record deposits' });
        }
        
        const recordedBy = roleCheck.rows[0].id;
        
        const result = await query(
            `INSERT INTO transaction_ledger (chama_id, member_id, transaction_type, amount_usdt, status, recorded_by, payment_method, transaction_reference)
             VALUES ($1, $2, 'deposit', $3, 'pending', $4, $5, $6)
             RETURNING id, amount_usdt, status, created_at`,
            [chamaId, member_id, amount, recordedBy, payment_method, transaction_reference]
        );
        
        await recordActivity(chamaId, 'deposit_recorded', userId);
        
        res.status(201).json({
            success: true,
            message: 'Deposit recorded, pending approval',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve deposit
const approveDeposit = async (req, res) => {
    try {
        const { chamaId, depositId } = req.params;
        const userId = req.user.id;
        
        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );
        
        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can approve deposits' });
        }
        
        const result = await query(
            `UPDATE transaction_ledger 
             SET status = 'approved', approved_by = $1, approved_at = NOW()
             WHERE id = $2 AND chama_id = $3 AND status = 'pending'
             RETURNING *`,
            [chairCheck.rows[0].id, depositId, chamaId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });
        }
        
        await recordActivity(chamaId, 'deposit_approved', userId);
        
        res.json({ success: true, message: 'Deposit approved', data: result.rows[0] });
        
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get chama balance
const getChamaBalance = async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const balance = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loans_disbursed,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_repayment' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loan_repayments,
                COALESCE(SUM(CASE WHEN transaction_type = 'fine' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_fines
             FROM transaction_ledger
             WHERE chama_id = $1`,
            [chamaId]
        );
        
        const currentBalance = balance.rows[0].total_deposits - balance.rows[0].total_withdrawals - balance.rows[0].total_loans_disbursed + balance.rows[0].total_loan_repayments + balance.rows[0].total_fines;
        
        res.json({ success: true, data: { ...balance.rows[0], current_balance: currentBalance } });
        
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get member balance
const getMemberBalance = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        
        const balance = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_deposits,
                COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_disbursement' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loans_taken,
                COALESCE(SUM(CASE WHEN transaction_type = 'loan_repayment' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_loan_repayments,
                COALESCE(SUM(CASE WHEN transaction_type = 'fine' AND status = 'approved' THEN amount_usdt ELSE 0 END), 0) as total_fines
             FROM transaction_ledger
             WHERE chama_id = $1 AND member_id = $2 AND status = 'approved'`,
            [chamaId, memberId]
        );
        
        const currentBalance = balance.rows[0].total_deposits - balance.rows[0].total_withdrawals - balance.rows[0].total_loans_taken + balance.rows[0].total_loan_repayments - balance.rows[0].total_fines;
        
        res.json({ success: true, data: { ...balance.rows[0], current_balance: currentBalance } });
        
    } catch (error) {
        console.error('Get member balance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const transactions = await query(
            `SELECT t.*, u.full_name as member_name
             FROM transaction_ledger t
             LEFT JOIN group_members gm ON t.member_id = gm.id
             LEFT JOIN users u ON gm.user_id = u.id
             WHERE t.chama_id = $1
             ORDER BY t.created_at DESC
             LIMIT $2 OFFSET $3`,
            [chamaId, parseInt(limit), parseInt(offset)]
        );
        
        res.json({ success: true, data: transactions.rows, pagination: { limit: parseInt(limit), offset: parseInt(offset) } });
        
    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { recordDeposit, approveDeposit, getChamaBalance, getMemberBalance, getTransactionHistory };
