// Cancel pending payment - with timestamp
async function cancelPayment(req, res) {
    try {
        const { orderId } = req.params;
        
        // Check if transaction exists and is pending
        const transaction = await query(
            `SELECT id, status FROM transaction_ledger 
             WHERE transaction_reference = $1`,
            [orderId]
        );
        
        if (transaction.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Transaction not found',
                code: 404 
            });
        }
        
        if (transaction.rows[0].status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot cancel transaction that is already ' + transaction.rows[0].status,
                code: 400 
            });
        }
        
        // Update status to cancelled AND set approved_at to NOW()
        await query(
            `UPDATE transaction_ledger 
             SET status = 'cancelled', approved_at = NOW()
             WHERE transaction_reference = $1`,
            [orderId]
        );
        
        res.json({
            success: true,
            message: 'Payment cancelled successfully',
            data: {
                order_id: orderId,
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Cancel payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel payment', code: 500 });
    }
}
