const { query } = require('../config/database');
const { PLANS, SETUP_FEES, FREE_TIER_MAX_MEMBERS } = require('../config/constants');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create chama with setup fee
const createChama = async (req, res) => {
    try {
        const { name, plan = PLANS.FREE } = req.body;
        const userId = req.user.id;
        
        if (!Object.values(PLANS).includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }
        
        const setupFee = SETUP_FEES[plan];
        
        if (setupFee > 0) {
            const chamaResult = await query(
                `INSERT INTO chamas (name, plan, created_by, payment_status, settings)
                 VALUES ($1, $2, $3, 'pending', $4)
                 RETURNING id, name, plan`,
                [name, plan, userId, {}]
            );
            
            const chama = chamaResult.rows[0];
            
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
        
        const chamaResult = await query(
            `INSERT INTO chamas (name, plan, created_by, setup_fee_paid, payment_status, last_activity_at)
             VALUES ($1, $2, $3, TRUE, 'completed', NOW())
             RETURNING id, name, plan, created_at`,
            [name, plan, userId]
        );
        
        const chama = chamaResult.rows[0];
        
        const memberNumber = '001';
        const chamaMemberId = `M-${memberNumber}`;
        
        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, 'chairperson', $3)`,
            [chama.id, userId, chamaMemberId]
        );
        
        // Record activity
        await recordActivity(chama.id, 'chama_created', userId);
        
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

module.exports = { createChama, confirmPayment, getUserChamas, getChama };
