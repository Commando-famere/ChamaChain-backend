const { query } = require('../config/database');
const { PLANS, SETUP_FEES, FREE_TIER_MAX_MEMBERS } = require('../config/constants');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create chama with setup fee
const createChama = async (req, res) => {
    try {
        const { name, plan = PLANS.FREE, chama_type = 'investment' } = req.body;
        const userId = req.user.id;

        if (!Object.values(PLANS).includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const setupFee = SETUP_FEES[plan];

        if (setupFee > 0) {
            const chamaResult = await query(
                `INSERT INTO chamas (name, plan, chama_type, created_by, payment_status, settings)
                 VALUES ($1, $2, $3, $4, 'pending', $5)
                 RETURNING id, name, plan, chama_type`,
                [name, plan, chama_type, userId, {}]
            );

            const chama = chamaResult.rows[0];

            return res.status(202).json({
                success: true,
                requires_payment: true,
                amount: setupFee,
                currency: 'KES',
                chama_id: chama.id,
                chama_type: chama.chama_type,
                message: `Setup fee of KES ${setupFee} required to create chama`,
                payment_link: `${process.env.BASE_URL}/pay/${chama.id}`,
                order_id: `CHAMA-${chama.id}`
            });
        }

        const chamaResult = await query(
            `INSERT INTO chamas (name, plan, chama_type, created_by, setup_fee_paid, payment_status, last_activity_at)
             VALUES ($1, $2, $3, $4, TRUE, 'completed', NOW())
             RETURNING id, name, plan, chama_type, created_at`,
            [name, plan, chama_type, userId]
        );

        const chama = chamaResult.rows[0];

        const memberNumber = '001';
        const chamaMemberId = `M-${memberNumber}`;

        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, 'chairperson', $3)`,
            [chama.id, userId, chamaMemberId]
        );

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

// Confirm payment and activate chama
const confirmPayment = async (req, res) => {
    try {
        const { chama_id, payment_reference } = req.body;
        const userId = req.user.id;

        const chamaResult = await query(
            `SELECT * FROM chamas WHERE id = $1 AND created_by = $2`,
            [chama_id, userId]
        );

        if (chamaResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chama not found' });
        }

        const chama = chamaResult.rows[0];

        await query(
            `UPDATE chamas
             SET setup_fee_paid = TRUE,
                 setup_fee_paid_at = NOW(),
                 payment_status = 'completed',
                 last_activity_at = NOW()
             WHERE id = $1`,
            [chama_id]
        );

        const memberNumber = '001';
        const chamaMemberId = `M-${memberNumber}`;

        await query(
            `INSERT INTO group_members (chama_id, user_id, role, chama_member_id)
             VALUES ($1, $2, 'chairperson', $3)`,
            [chama_id, userId, chamaMemberId]
        );

        await recordActivity(chama_id, 'chama_activated', userId);

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
            `SELECT c.id, c.name, c.plan, c.chama_type, c.created_at,
                    gm.role, gm.chama_member_id, gm.joined_at,
                    c.setup_fee_paid, c.payment_status,
                    c.is_active, c.last_activity_at
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

// Upgrade chama plan
const upgradePlan = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { new_plan } = req.body;

        if (![PLANS.MEMBERS_ONLY, PLANS.FULL_MONEY].includes(new_plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const chairCheck = await query(
            `SELECT id FROM group_members
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can upgrade plan' });
        }

        await query(`UPDATE chamas SET plan = $1, updated_at = NOW() WHERE id = $2`, [new_plan, chamaId]);

        const amount = new_plan === PLANS.MEMBERS_ONLY ? 50 : 150;
        await query(
            `UPDATE subscriptions SET plan = $1, amount_kes = $2 WHERE chama_id = $3`,
            [new_plan, amount, chamaId]
        );

        await recordActivity(chamaId, 'plan_upgraded', userId);

        res.json({ success: true, message: `Chama upgraded to ${new_plan}`, data: { plan: new_plan, amount_kes: amount } });

    } catch (error) {
        console.error('Upgrade plan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createChama, confirmPayment, getUserChamas, getChama, upgradePlan };
