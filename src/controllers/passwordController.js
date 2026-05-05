const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { sendPasswordResetEmail } = require('../services/emailService');

// Generate random 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Request password reset (send code)
const forgotPassword = async (req, res) => {
    try {
        const { phone, email } = req.body;
        
        if (!phone && !email) {
            return res.status(400).json({
                success: false,
                message: 'Phone number or email required'
            });
        }
        
        // Find user
        let user;
        if (phone) {
            const result = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
            user = result.rows[0];
        } else if (email) {
            const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
            user = result.rows[0];
        }
        
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({
                success: true,
                message: 'If account exists, you will receive a recovery code'
            });
        }
        
        // Check if user has email
        if (!user.email) {
            return res.status(400).json({
                success: false,
                message: 'No email associated with this account. Please contact support.'
            });
        }
        
        const code = generateCode();
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        
        // Save reset record
        await query(
            `INSERT INTO password_resets (user_id, token, code, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [user.id, token, code, expiresAt]
        );
        
        // Send email with professional template
        const baseUrl = process.env.BASE_URL || 'https://marvelous-nourishment-production-fef4.up.railway.app';
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        
        console.log(`📧 Attempting to send password reset email to: ${user.email}`);
        console.log(`   Code: ${code}`);
        console.log(`   Reset Link: ${resetLink}`);
        
        const emailResult = await sendPasswordResetEmail(user.email, user.full_name, code, resetLink);
        
        if (emailResult.success) {
            console.log(`✅ Password reset email sent to ${user.email}`);
            res.json({
                success: true,
                message: 'Recovery code sent to your email',
                data: {
                    token: token
                }
            });
        } else {
            console.error(`❌ Failed to send email: ${emailResult.error}`);
            res.status(500).json({
                success: false,
                message: 'Failed to send recovery email. Please try again later.',
                error: emailResult.error
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify code and reset password
const resetPassword = async (req, res) => {
    try {
        const { token, code, new_password } = req.body;
        
        if (!token || !code || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Token, code, and new password required'
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        // Find valid reset record
        const resetResult = await query(
            `SELECT * FROM password_resets 
             WHERE token = $1 AND code = $2 AND used = false AND expires_at > NOW()`,
            [token, code]
        );
        
        if (resetResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired recovery code'
            });
        }
        
        const reset = resetResult.rows[0];
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 12);
        
        // Update user password
        await query(
            `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
            [hashedPassword, reset.user_id]
        );
        
        // Mark reset as used
        await query(`UPDATE password_resets SET used = true WHERE id = $1`, [reset.id]);
        
        // Invalidate all sessions for this user
        await query(`UPDATE user_sessions SET is_active = false WHERE user_id = $1`, [reset.user_id]);
        
        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify recovery code
const verifyCode = async (req, res) => {
    try {
        const { token, code } = req.body;
        
        const result = await query(
            `SELECT id FROM password_resets 
             WHERE token = $1 AND code = $2 AND used = false AND expires_at > NOW()`,
            [token, code]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired code'
            });
        }
        
        res.json({
            success: true,
            message: 'Code verified'
        });
        
    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { forgotPassword, resetPassword, verifyCode };
