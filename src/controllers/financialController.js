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
