const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Start a new contribution cycle
const startCycle = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { start_date, end_date, cycle_number } = req.body;
        const userId = req.user.id;

        // Check if user is chairperson or treasurer
        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'treasurer'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or treasurer can start cycles' });
        }

        // Get last cycle number
        const lastCycle = await query(
            `SELECT MAX(cycle_number) as last FROM contribution_cycles WHERE chama_id = $1`,
            [chamaId]
        );
        const nextCycle = cycle_number || (lastCycle.rows[0].last || 0) + 1;

        const result = await query(
            `INSERT INTO contribution_cycles (chama_id, cycle_number, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING *`,
            [chamaId, nextCycle, start_date, end_date]
        );

        await recordActivity(chamaId, 'cycle_started', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Start cycle error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Record member contribution
const recordContribution = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { member_id, amount, payment_method, transaction_id, cycle_id } = req.body;
        const userId = req.user.id;

        // Check if user is authorized (treasurer or self)
        if (userId !== member_id) {
            const roleCheck = await query(
                `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
                [chamaId, userId]
            );
            if (!['chairperson', 'treasurer'].includes(roleCheck.rows[0]?.role)) {
                return res.status(403).json({ success: false, message: 'Only treasurer can record others\' contributions' });
            }
        }

        // Get active cycle if not specified
        let activeCycle = cycle_id;
        if (!activeCycle) {
            const cycle = await query(
                `SELECT id FROM contribution_cycles WHERE chama_id = $1 AND status = 'active' LIMIT 1`,
                [chamaId]
            );
            activeCycle = cycle.rows[0]?.id;
        }

        // Check if contribution is late
        const cycleInfo = await query(
            `SELECT end_date FROM contribution_cycles WHERE id = $1`,
            [activeCycle]
        );
        const isLate = cycleInfo.rows[0]?.end_date ? new Date() > new Date(cycleInfo.rows[0].end_date) : false;

        // Get penalty rules
        const penaltyRule = await query(
            `SELECT amount FROM penalty_rules WHERE chama_id = $1 AND violation_type = 'late_contribution' AND is_active = true`,
            [chamaId]
        );
        const penaltyAmount = isLate && penaltyRule.rows[0] ? penaltyRule.rows[0].amount : 0;

        const result = await query(
            `INSERT INTO member_contributions (chama_id, member_id, amount, payment_method, transaction_id, cycle_id, is_late, penalty_amount, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [chamaId, member_id, amount, payment_method, transaction_id, activeCycle, isLate, penaltyAmount, userId]
        );

        // Update member balance
        await query(
            `INSERT INTO member_balances (chama_id, member_id, balance_usdt, last_updated)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (chama_id, member_id) 
             DO UPDATE SET balance_usdt = member_balances.balance_usdt + $3, last_updated = NOW()`,
            [chamaId, member_id, amount]
        );

        // Update cycle total
        await query(
            `UPDATE contribution_cycles SET total_collected = total_collected + $1 WHERE id = $2`,
            [amount, activeCycle]
        );

        await recordActivity(chamaId, 'contribution_recorded', userId);
        res.json({ success: true, data: result.rows[0], penalty_applied: penaltyAmount > 0 });
    } catch (error) {
        console.error('Record contribution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process payout (Merry-Go-Round)
const processPayout = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { cycle_id, recipient_member_id } = req.body;
        const userId = req.user.id;

        // Verify user is chairperson
        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (roleCheck.rows[0]?.role !== 'chairperson') {
            return res.status(403).json({ success: false, message: 'Only chairperson can process payouts' });
        }

        const cycle = await query(
            `SELECT total_collected, cycle_number FROM contribution_cycles WHERE id = $1 AND chama_id = $2`,
            [cycle_id, chamaId]
        );

        if (cycle.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cycle not found' });
        }

        await query(
            `UPDATE contribution_cycles 
             SET recipient_member_id = $1, status = 'completed', end_date = NOW()
             WHERE id = $2`,
            [recipient_member_id, cycle_id]
        );

        // Record payout transaction
        await query(
            `INSERT INTO transaction_ledger (chama_id, member_id, transaction_type, amount_usdt, status)
             VALUES ($1, $2, 'payout', $3, 'completed')`,
            [chamaId, recipient_member_id, cycle.rows[0].total_collected]
        );

        await recordActivity(chamaId, 'payout_processed', userId);
        res.json({ success: true, message: `KES ${cycle.rows[0].total_collected} paid out to member` });
    } catch (error) {
        console.error('Process payout error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get cycles for a chama
const getCycles = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const result = await query(
            `SELECT c.*, u.full_name as recipient_name
             FROM contribution_cycles c
             LEFT JOIN users u ON c.recipient_member_id = u.id
             WHERE c.chama_id = $1
             ORDER BY c.cycle_number DESC`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get cycles error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { startCycle, recordContribution, processPayout, getCycles };
