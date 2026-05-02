// Plan Check Middleware
const { query } = require('../config/database');
const { PLANS, FREE_TIER_MAX_MEMBERS } = require('../config/constants');

async function getChamaPlan(chamaId) {
    const result = await query(`SELECT plan FROM chamas WHERE id = $1`, [chamaId]);
    return result.rows[0]?.plan || PLANS.FREE;
}

async function checkMemberLimit(chamaId) {
    const plan = await getChamaPlan(chamaId);
    
    if (plan === PLANS.FREE) {
        const result = await query(
            `SELECT COUNT(*) as count FROM group_members WHERE chama_id = $1 AND is_active = true`,
            [chamaId]
        );
        const count = parseInt(result.rows[0].count);
        if (count >= FREE_TIER_MAX_MEMBERS) {
            return { allowed: false, message: `Free tier limited to ${FREE_TIER_MAX_MEMBERS} members. Upgrade to add more.` };
        }
    }
    return { allowed: true };
}

async function requireMoneyPlan(req, res, next) {
    try {
        const chamaId = req.params.chamaId || req.body.chama_id;
        
        if (!chamaId) {
            return res.status(400).json({ success: false, message: 'Chama ID required', code: 400 });
        }
        
        const plan = await getChamaPlan(chamaId);
        
        if (plan !== PLANS.FULL_MONEY) {
            return res.status(403).json({
                success: false,
                message: 'Money features require Full + Money plan (KES 150/month)',
                code: 403
            });
        }
        
        next();
    } catch (error) {
        console.error('Plan check error:', error);
        res.status(500).json({ success: false, message: 'Plan verification failed', code: 500 });
    }
}

module.exports = { getChamaPlan, checkMemberLimit, requireMoneyPlan };
