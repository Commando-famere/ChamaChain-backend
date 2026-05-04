// When approving a transaction, set approved_at
async function approveTransaction(req, res) {
    try {
        const { transactionId } = req.params;
        
        await query(
            `UPDATE transaction_ledger 
             SET status = 'approved', approved_at = NOW()
             WHERE id = $1`,
            [transactionId]
        );
        
        res.json({ success: true, message: 'Transaction approved' });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve' });
    }
}

// Request withdrawal with fee
const requestWithdrawal = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { amount, destination } = req.body;
        const { WITHDRAWAL_FEE_KES } = require('../config/constants');
        
        // Get member
        const memberResult = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }
        
        const memberId = memberResult.rows[0].id;
        
        // Check balance
        const balanceResult = await query(
            `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount_usdt ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount_usdt ELSE 0 END), 0) as balance
             FROM transaction_ledger
             WHERE member_id = $1 AND status = 'approved'`,
            [memberId]
        );
        
        const balance = parseFloat(balanceResult.rows[0].balance);
        const totalRequired = amount + WITHDRAWAL_FEE_KES;
        
        if (balance < totalRequired) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Need ${totalRequired} USDT (${amount} withdrawal + ${WITHDRAWAL_FEE_KES} fee)`
            });
        }
        
        // Create withdrawal request with fee
        const result = await query(
            `INSERT INTO transaction_ledger (chama_id, member_id, transaction_type, amount_usdt, withdrawal_fee_kes, status, destination_wallet)
             VALUES ($1, $2, 'withdrawal', $3, $4, 'pending', $5)
             RETURNING *`,
            [chamaId, memberId, amount, WITHDRAWAL_FEE_KES, destination]
        );
        
        res.json({
            success: true,
            message: `Withdrawal request submitted. Fee: KES ${WITHDRAWAL_FEE_KES}`,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Request withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { requestWithdrawal };
