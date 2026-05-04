const { query } = require('../config/database');
const { WITHDRAWAL_FEE_KES, BYBIT_NETWORK_FEE_USDT } = require('../config/constants');
const { sendToBybit } = require('../services/bybitService');

const requestWithdrawal = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { amount_kes, destination_wallet } = req.body;
        
        if (amount_kes < 200) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal is KES 200'
            });
        }
        
        const memberResult = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }
        
        const memberId = memberResult.rows[0].id;
        
        const usdRate = 130;
        const amount_usdt = amount_kes / usdRate;
        const platformFeeKes = WITHDRAWAL_FEE_KES;
        const amountAfterPlatformFee = amount_kes - platformFeeKes;
        const amountToSendUsdt = amountAfterPlatformFee / usdRate;
        
        const balanceResult = await query(
            `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount_usdt ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount_usdt ELSE 0 END), 0) as balance
             FROM transaction_ledger
             WHERE member_id = $1 AND status = 'approved'`,
            [memberId]
        );
        
        const balance = parseFloat(balanceResult.rows[0].balance);
        
        if (balance < amount_usdt) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. You have ${balance.toFixed(2)} USDT, need ${amount_usdt.toFixed(2)} USDT`
            });
        }
        
        const withdrawalResult = await query(
            `INSERT INTO transaction_ledger 
             (chama_id, member_id, transaction_type, amount_usdt, amount_kes, withdrawal_fee_kes, status, destination_wallet)
             VALUES ($1, $2, 'withdrawal', $3, $4, $5, 'processing', $6)
             RETURNING id`,
            [chamaId, memberId, amount_usdt, amount_kes, platformFeeKes, destination_wallet]
        );
        
        const withdrawalId = withdrawalResult.rows[0].id;
        
        // REAL Bybit withdrawal
        const bybitResult = await sendToBybit({
            amount: amountToSendUsdt,
            currency: 'USDT',
            destination: destination_wallet,
            network_fee: BYBIT_NETWORK_FEE_USDT
        });
        
        if (bybitResult.success) {
            await query(
                `UPDATE transaction_ledger 
                 SET status = 'approved', 
                     approved_at = NOW(),
                     bybit_tx_hash = $1,
                     network_fee_usdt = $2
                 WHERE id = $3`,
                [bybitResult.tx_hash, BYBIT_NETWORK_FEE_USDT, withdrawalId]
            );
            
            // Deduct from member balance
            await query(
                `UPDATE member_balances 
                 SET balance_usdt = balance_usdt - $1, updated_at = NOW()
                 WHERE member_id = $2`,
                [amount_usdt, memberId]
            );
            
            res.json({
                success: true,
                message: `Withdrawal of KES ${amount_kes} processed successfully`,
                data: {
                    withdrawal_id: withdrawalId,
                    requested_amount: amount_kes,
                    platform_fee: platformFeeKes,
                    network_fee_usdt: BYBIT_NETWORK_FEE_USDT,
                    amount_sent_usdt: amountToSendUsdt,
                    transaction_hash: bybitResult.tx_hash,
                    withdrawal_id_bybit: bybitResult.withdrawal_id,
                    user_receives: `~KES ${(amountToSendUsdt * usdRate).toFixed(0)}`
                }
            });
        } else {
            await query(`UPDATE transaction_ledger SET status = 'failed' WHERE id = $1`, [withdrawalId]);
            
            res.status(500).json({
                success: false,
                message: 'Withdrawal failed',
                error: bybitResult.error
            });
        }
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { requestWithdrawal };
