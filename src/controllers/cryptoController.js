// Crypto Payment Controller
const { query } = require('../config/database');
const { createPaymentRequest, verifyPayment } = require('../services/bybitService');

// Initiate crypto payment for contribution
async function initiateContributionPayment(req, res) {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { amount, currency = 'USDT' } = req.body;

        // Get member details
        const member = await query(
            `SELECT gm.id as member_id, gm.chama_member_id, u.full_name
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, userId]
        );

        if (member.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member', code: 403 });
        }

        // Create unique order ID
        const orderId = `CHM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Create payment request
        const payment = await createPaymentRequest(amount, currency, orderId, member.rows[0].full_name);
        
        if (!payment.success) {
            return res.status(500).json({ success: false, message: 'Payment creation failed', code: 500 });
        }

        // Record pending transaction
        await query(
            `INSERT INTO transaction_ledger (chama_id, member_id, transaction_type, amount_usdt, status, transaction_reference)
             VALUES ($1, $2, 'deposit', $3, 'pending', $4)`,
            [chamaId, member.rows[0].member_id, amount, orderId]
        );

        res.json({
            success: true,
            message: 'Payment initiated',
            data: {
                order_id: orderId,
                amount: amount,
                currency: currency,
                payment_link: payment.payment_link,
                qr_code: payment.qr_code,
                expires_at: payment.expires_at
            }
        });

    } catch (error) {
        console.error('Initiate payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment', code: 500 });
    }
}

// Verify payment status
async function verifyContributionPayment(req, res) {
    try {
        const { chamaId, orderId } = req.params;
        
        // Verify payment with Bybit
        const verification = await verifyPayment(orderId);
        
        if (!verification.success) {
            return res.status(500).json({ success: false, message: 'Verification failed', code: 500 });
        }

        if (verification.status === 'paid') {
            // Update transaction status
            await query(
                `UPDATE transaction_ledger 
                 SET status = 'approved', approved_at = NOW()
                 WHERE transaction_reference = $1 AND chama_id = $2`,
                [orderId, chamaId]
            );
        }

        res.json({
            success: true,
            data: {
                order_id: orderId,
                status: verification.status,
                transaction_hash: verification.transaction_hash
            }
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment', code: 500 });
    }
}

// Get payment history
async function getPaymentHistory(req, res) {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        const member = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2`,
            [chamaId, userId]
        );

        if (member.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member', code: 403 });
        }

        const payments = await query(
            `SELECT id, amount_usdt, status, transaction_reference, created_at, approved_at
             FROM transaction_ledger
             WHERE member_id = $1 AND transaction_type = 'deposit'
             ORDER BY created_at DESC`,
            [member.rows[0].id]
        );

        res.json({ success: true, data: payments.rows });

    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ success: false, message: 'Failed to get payment history', code: 500 });
    }
}

module.exports = { initiateContributionPayment, verifyContributionPayment, getPaymentHistory };
