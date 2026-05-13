// Reactivation Controller
// Handles chama reactivation payments

const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Check if chama needs reactivation
const checkReactivationStatus = async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const result = await query(
            `SELECT is_active, plan, last_activity_at, inactivity_status
             FROM chamas WHERE id = $1`,
            [chamaId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chama not found' });
        }
        
        const chama = result.rows[0];
        
        if (chama.plan === 'free') {
            return res.json({
                success: true,
                requires_reactivation: false,
                message: 'Free plan does not require reactivation'
            });
        }
        
        if (chama.is_active) {
            return res.json({
                success: true,
                requires_reactivation: false,
                is_active: true,
                last_activity: chama.last_activity_at
            });
        }
        
        const daysInactive = Math.floor((Date.now() - new Date(chama.last_activity_at)) / (1000 * 60 * 60 * 24));
        
        res.json({
            success: true,
            requires_reactivation: true,
            is_active: false,
            days_inactive: daysInactive,
            reactivation_fee: 50,
            currency: 'KES',
            message: `Chama inactive for ${days_inactive} days. Pay KES 50 to reactivate.`
        });
        
    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reactivate chama (pay KES 50)
const reactivateChama = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { payment_method, payment_reference } = req.body;
        
        // Check if chama exists
        const chamaResult = await query(
            `SELECT plan, is_active FROM chamas WHERE id = $1`,
            [chamaId]
        );
        
        if (chamaResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chama not found' });
        }
        
        const chama = chamaResult.rows[0];
        
        if (chama.plan === 'free') {
            return res.status(400).json({ 
                success: false, 
                message: 'Free plan does not require reactivation' 
            });
        }
        
        if (chama.is_active) {
            return res.status(400).json({ 
                success: false, 
                message: 'Chama is already active' 
            });
        }
        
        // Process payment (KES 50)
        // In production, integrate with M-Pesa or crypto
        const paymentSuccess = true; // Simulate payment success
        
        if (!paymentSuccess) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment failed. Please try again.' 
            });
        }
        
        // Reactivate chama
        await query(
            `UPDATE chamas 
             SET is_active = TRUE, 
                 inactivity_status = 'active', 
                 last_activity_at = NOW(),
                 last_reactivated_at = NOW()
             WHERE id = $1`,
            [chamaId]
        );
        
        // Record reactivation activity
        await recordActivity(chamaId, 'reactivation', userId);
        
        // Record payment transaction
        await query(
            `INSERT INTO transaction_ledger 
             (chama_id, transaction_type, amount_kes, status, payment_method, transaction_reference, notes)
             VALUES ($1, 'reactivation_fee', 50, 'approved', $2, $3, 'Chama reactivation fee')`,
            [chamaId, payment_method, payment_reference]
        );
        
        res.json({
            success: true,
            message: 'Chama reactivated successfully!',
            data: {
                chama_id: chamaId,
                reactivated_at: new Date().toISOString(),
                amount_paid: 50,
                currency: 'KES'
            }
        });
        
    } catch (error) {
        console.error('Reactivation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { checkReactivationStatus, reactivateChama };
