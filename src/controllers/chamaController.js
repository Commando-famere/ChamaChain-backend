const { query } = require('../config/database');
const { PLANS, SETUP_FEES, FREE_TIER_MAX_MEMBERS } = require('../config/constants');

// Create chama with setup fee
const createChama = async (req, res) => {
    try {
        const { name, plan = PLANS.FREE } = req.body;
        const userId = req.user.id;
        
        // Validate plan
        if (!Object.values(PLANS).includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }
        
        const setupFee = SETUP_FEES[plan];
        
        // For paid plans, require setup fee payment
        if (setupFee > 0) {
            // Create pending chama record
            const chamaResult = await query(
                `INSERT INTO chamas (name, plan, created_by, payment_status, settings)
                 VALUES ($1, $2, $3, 'pending', $4)
                 RETURNING id, name, plan`,
                [name, plan, userId, {}]
            );
            
            const chama = chamaResult.rows[0];
            
            // Return payment details
            return res.status(202).json({
                success: true,
                requires_payment: true,
                amount: setupFee,
                currency: 'KES',
                chama_id: chama.id,
                message: `Setup fee of KES ${setupFee} required to create chama`,
                payment_link: `${process.env.BASE_URL}/pay/${chama.id}`,
                order_id: `CHAMA-${chama.id}`
            });
        }
        
        // Free plan - create immediately
        const chamaResult = await query(
            `INSERT INTO chamas (name, plan, created_by, setup_fee_paid, payment_status)
             VALUES ($1, $2, $3, TRUE, 'completed')
             RETURNING id, name, plan, created_at`,
            [name, plan, userId]
        );
        
        const chama = chamaResult.rows[0];
        
        // Add creator as chairperson
        const memberNumber = '001';
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, 'chairperson', $3)`,
            [chama.id, userId, chamaMemberId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Chama created successfully',
            data: { chama }
        });
        
    } catch (error) {
        console.error('Create chama error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Confirm payment and activate chama
const confirmPayment = async (req, res) => {
    try {
        const { chama_id, payment_reference } = req.body;
        const userId = req.user.id;
        
        // Verify chama exists and belongs to user
        const chamaResult = await query(
            `SELECT * FROM chamas WHERE id = $1 AND created_by = $2`,
            [chama_id, userId]
        );
        
        if (chamaResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chama not found' });
        }
        
        const chama = chamaResult.rows[0];
        
        // Update chama as paid
        await query(
            `UPDATE chamas 
             SET setup_fee_paid = TRUE, 
                 setup_fee_paid_at = NOW(), 
                 payment_status = 'completed'
             WHERE id = $1`,
            [chama_id]
        );
        
        // Add creator as chairperson
        const memberNumber = '001';
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, 'chairperson', $3)`,
            [chama_id, userId, chamaMemberId]
        );
        
        res.json({
            success: true,
            message: 'Payment confirmed. Chama activated!',
            data: { chama_id: chama_id, activated: true }
        });
        
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get user's chamas
const getUserChamas = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await query(
            `SELECT c.id, c.name, c.plan, c.created_at,
                    gm.role, gm.chama_member_id, gm.joined_at,
                    c.setup_fee_paid, c.payment_status
             FROM chamas c
             JOIN group_members gm ON c.id = gm.chama_id
             WHERE gm.user_id = $1 AND gm.is_active = true
             ORDER BY gm.joined_at DESC`,
            [userId]
        );
        
        res.json({ success: true, data: result.rows });
        
    } catch (error) {
        console.error('Get chamas error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get chama details
const getChama = async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const result = await query(
            `SELECT c.*, COUNT(gm.id) as member_count
             FROM chamas c
             LEFT JOIN group_members gm ON c.id = gm.chama_id AND gm.is_active = true
             WHERE c.id = $1
             GROUP BY c.id`,
            [chamaId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chama not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Get chama error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createChama, confirmPayment, getUserChamas, getChama };
