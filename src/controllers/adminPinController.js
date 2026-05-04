const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Set/Update Admin PIN
const setAdminPin = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { pin } = req.body;
        
        if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
            return res.status(400).json({ 
                success: false, 
                message: 'PIN must be 6 digits' 
            });
        }
        
        // Get member ID and role
        const memberResult = await query(
            `SELECT id, role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('chairperson', 'treasurer', 'secretary')`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only chairperson, treasurer, or secretary can set admin PIN' 
            });
        }
        
        const memberId = memberResult.rows[0].id;
        const hashedPin = await bcrypt.hash(pin, 10);
        
        await query(
            `INSERT INTO admin_pins (member_id, pin_hash, pin_setup)
             VALUES ($1, $2, true)
             ON CONFLICT (member_id) 
             DO UPDATE SET pin_hash = $2, pin_setup = true, updated_at = NOW()`,
            [memberId, hashedPin]
        );
        
        res.json({ 
            success: true, 
            message: 'Admin PIN set successfully' 
        });
        
    } catch (error) {
        console.error('Set PIN error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify Admin PIN
const verifyAdminPin = async (memberId, pin) => {
    const result = await query(
        `SELECT pin_hash, failed_attempts, locked_until FROM admin_pins WHERE member_id = $1`,
        [memberId]
    );
    
    if (result.rows.length === 0) {
        return { success: false, message: 'PIN not set for this admin' };
    }
    
    const admin = result.rows[0];
    
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        return { success: false, message: 'PIN locked. Try again later.' };
    }
    
    const isValid = await bcrypt.compare(pin, admin.pin_hash);
    
    if (!isValid) {
        const newAttempts = (admin.failed_attempts || 0) + 1;
        let lockedUntil = null;
        
        if (newAttempts >= 5) {
            lockedUntil = new Date();
            lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
        }
        
        await query(
            `UPDATE admin_pins SET failed_attempts = $1, locked_until = $2 WHERE member_id = $3`,
            [newAttempts, lockedUntil, memberId]
        );
        
        return { success: false, message: `Invalid PIN. ${5 - newAttempts} attempts remaining.` };
    }
    
    await query(`UPDATE admin_pins SET failed_attempts = 0, locked_until = NULL WHERE member_id = $1`, [memberId]);
    
    return { success: true };
};

module.exports = { setAdminPin, verifyAdminPin };
