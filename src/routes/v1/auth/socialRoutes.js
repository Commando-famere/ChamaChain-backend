const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { query } = require('../../../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth/google/callback",
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        const recoveryMode = req.query.recovery_mode === 'true';
        
        // Check if user exists
        const userResult = await query(`SELECT * FROM users WHERE email = $1`, [email]);
        
        if (userResult.rows.length === 0) {
            return done(null, false, { message: 'No account found with this email' });
        }
        
        const user = userResult.rows[0];
        
        // Check or create social login
        const socialResult = await query(
            `SELECT * FROM social_logins WHERE provider = 'google' AND provider_id = $1`,
            [profile.id]
        );
        
        if (socialResult.rows.length === 0) {
            await query(
                `INSERT INTO social_logins (user_id, provider, provider_id, email)
                 VALUES ($1, 'google', $2, $3)`,
                [user.id, profile.id, email]
            );
        }
        
        // Generate reset token for recovery mode
        if (recoveryMode) {
            const resetToken = jwt.sign(
                { id: user.id, email: user.email, reset: true },
                JWT_SECRET,
                { expiresIn: '10m' }
            );
            return done(null, { user, resetToken, recoveryMode: true });
        }
        
        // Normal login
        const authToken = jwt.sign(
            { id: user.id, email: user.email, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        return done(null, { user, token: authToken, recoveryMode: false });
        
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Google OAuth endpoints
router.get('/google', (req, res, next) => {
    const recoveryMode = req.query.recovery_mode === 'true';
    const state = JSON.stringify({ recoveryMode });
    const authenticator = passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: state
    });
    authenticator(req, res, next);
});

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const { user, resetToken, token, recoveryMode } = req.user;
        
        if (recoveryMode && resetToken) {
            // Redirect to reset password page with token
            return res.redirect(`${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&social=true`);
        }
        
        if (token) {
            // Normal login success
            return res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
        }
        
        res.redirect('/login');
    }
);

// Reset password after social recovery
router.post('/social-reset', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        
        if (!token || !new_password) {
            return res.status(400).json({ success: false, message: 'Token and new password required' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (!decoded.reset) {
            return res.status(401).json({ success: false, message: 'Invalid reset token' });
        }
        
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(new_password, 12);
        
        await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hashedPassword, decoded.id]);
        
        // Invalidate all sessions
        await query(`UPDATE user_sessions SET is_active = false WHERE user_id = $1`, [decoded.id]);
        
        res.json({ success: true, message: 'Password reset successfully' });
        
    } catch (error) {
        console.error('Social reset error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
