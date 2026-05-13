const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../config/database');

// Record a deposit (Chairperson or Treasurer)
router.post('/chamas/:chamaId/deposits', verifyToken, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { member_id, amount, payment_method, transaction_reference } = req.body;
        
        // Verify user is chairperson or treasurer
        const roleCheck = await query(
            `SELECT id, role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('chairperson', 'treasurer')`,
            [chamaId, userId]
        );
        
        if (roleCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only chairperson or treasurer can record deposits' 
            });
        }
        
        const recordedBy = roleCheck.rows[0].id;
        
        // Create deposit transaction
        const result = await query(
            `INSERT INTO transaction_ledger (chama_id, member_id, transaction_type, amount_usdt, status, recorded_by, payment_method, transaction_reference)
             VALUES ($1, $2, 'deposit', $3, 'pending', $4, $5, $6)
             RETURNING id, amount_usdt, status, created_at`,
            [chamaId, member_id, amount, recordedBy, payment_method, transaction_reference]
        );
        
        res.status(201).json({
            success: true,
            message: 'Deposit recorded, pending approval',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve deposit (Chairperson only)
router.post('/chamas/:chamaId/deposits/:depositId/approve', verifyToken, async (req, res) => {
    try {
        const { chamaId, depositId } = req.params;
        const userId = req.user.id;
        
        // Verify chairperson
        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );
        
        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only chairperson can approve deposits' 
            });
        }
        
        // Approve deposit
        const result = await query(
            `UPDATE transaction_ledger 
             SET status = 'approved', approved_by = $1, approved_at = NOW()
             WHERE id = $2 AND chama_id = $3 AND status = 'pending'
             RETURNING *`,
            [chairCheck.rows[0].id, depositId, chamaId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Deposit not found or already processed' 
            });
        }
        
        res.json({
            success: true,
            message: 'Deposit approved',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get transaction history
router.get('/chamas/:chamaId/transactions', verifyToken, async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        const result = await query(
            `SELECT tl.*, u.full_name as member_name
             FROM transaction_ledger tl
             JOIN group_members gm ON tl.member_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE tl.chama_id = $1
             ORDER BY tl.created_at DESC
             LIMIT 50`,
            [chamaId]
        );
        
        res.json({ success: true, data: result.rows });
        
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
const { requireActiveChama } = require('../../middleware/inactivityCheck');

// Add to deposit routes
router.post('/chamas/:chamaId/deposits', verifyToken, requireActiveChama, recordDeposit);
router.post('/chamas/:chamaId/withdrawals', verifyToken, requireActiveChama, requestWithdrawal);
router.post('/chamas/:chamaId/loans', verifyToken, requireActiveChama, requestLoan);
