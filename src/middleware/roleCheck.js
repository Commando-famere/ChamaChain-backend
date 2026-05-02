// Role Check Middleware
const { query } = require('../config/database');

const checkRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            const chamaId = req.params.chamaId || req.body.chama_id;
            
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized', code: 401 });
            }
            
            if (!chamaId) {
                return next();
            }
            
            const result = await query(
                `SELECT role FROM group_members 
                 WHERE user_id = $1 AND chama_id = $2 AND is_active = true`,
                [userId, chamaId]
            );
            
            if (result.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied', code: 403 });
            }
            
            const userRole = result.rows[0].role;
            
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: `Role ${userRole} not authorized`,
                    code: 403
                });
            }
            
            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ success: false, message: 'Role verification failed', code: 500 });
        }
    };
};

const isChairperson = checkRole(['chairperson']);
const isTreasurer = checkRole(['treasurer', 'chairperson']);
const isSecretary = checkRole(['secretary', 'chairperson']);

module.exports = { checkRole, isChairperson, isTreasurer, isSecretary };
