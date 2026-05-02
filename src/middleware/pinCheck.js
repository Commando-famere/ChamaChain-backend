// PIN Check Middleware
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const verifyPin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { transaction_pin } = req.body;
        
        if (!transaction_pin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN required',
                code: 400
            });
        }
        
        const result = await query(
            `SELECT transaction_pin, pin_failed_attempts, pin_locked_until FROM users WHERE id = $1`,
            [userId]
        );
        
        const user = result.rows[0];
        
        if (!user.transaction_pin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN not set',
                code: 400
            });
        }
        
        if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
            return res.status(403).json({
                success: false,
                message: 'PIN locked. Try again later.',
                code: 403
            });
        }
        
        const isValid = await bcrypt.compare(transaction_pin, user.transaction_pin);
        
        if (!isValid) {
            const newAttempts = (user.pin_failed_attempts || 0) + 1;
            let lockedUntil = null;
            
            if (newAttempts >= 5) {
                lockedUntil = new Date();
                lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
            }
            
            await query(
                `UPDATE users SET pin_failed_attempts = $1, pin_locked_until = $2 WHERE id = $3`,
                [newAttempts, lockedUntil, userId]
            );
            
            return res.status(401).json({
                success: false,
                message: `Invalid PIN. ${5 - newAttempts} attempts remaining.`,
                code: 401
            });
        }
        
        await query(`UPDATE users SET pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = $1`, [userId]);
        
        next();
    } catch (error) {
        console.error('PIN verification error:', error);
        res.status(500).json({ success: false, message: 'PIN verification failed', code: 500 });
    }
};

module.exports = { verifyPin };
