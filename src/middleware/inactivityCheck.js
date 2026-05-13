// Inactivity Check Middleware
// Checks if chama is active before allowing sensitive operations

const { query } = require('../config/database');

// Check if chama is active
async function isChamaActive(chamaId) {
    const result = await query(
        `SELECT is_active, plan, inactivity_status, last_activity_at 
         FROM chamas WHERE id = $1`,
        [chamaId]
    );
    
    if (result.rows.length === 0) return true;
    
    const chama = result.rows[0];
    
    // Free plan never gets locked
    if (chama.plan === 'free') return true;
    
    return chama.is_active === true;
}

// Record activity
async function recordActivity(chamaId, activityType, userId) {
    await query(
        `INSERT INTO chama_activity_log (chama_id, activity_type, performed_by)
         VALUES ($1, $2, $3)`,
        [chamaId, activityType, userId]
    );
}

// Middleware to check activity for sensitive operations
const requireActiveChama = (req, res, next) => {
    const chamaId = req.params.chamaId || req.body.chama_id;
    
    if (!chamaId) {
        return next();
    }
    
    isChamaActive(chamaId).then(isActive => {
        if (!isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your chama is inactive. Pay KES 50 to reactivate and continue using ChamaChain.',
                code: 'CHAMA_INACTIVE',
                reactivation_fee: 50,
                reactivation_required: true
            });
        }
        next();
    }).catch(next);
};

// Record activity after successful operation
const recordActivityMiddleware = (activityType) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        const chamaId = req.params.chamaId || req.body.chama_id;
        const userId = req.user?.id;
        
        res.json = function(data) {
            if (data && data.success && chamaId && userId) {
                recordActivity(chamaId, activityType, userId).catch(console.error);
            }
            return originalJson.call(this, data);
        };
        
        next();
    };
};

module.exports = { isChamaActive, recordActivity, requireActiveChama, recordActivityMiddleware };
