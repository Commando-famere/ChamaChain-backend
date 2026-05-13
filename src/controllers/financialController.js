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
        
        // Record activity
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
        
        // Record activity
        await recordActivity(chamaId, 'deposit_approved', userId);
        
        res.json({ success: true, message: 'Deposit approved', data: result.rows[0] });
        
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { recordDeposit, approveDeposit };
