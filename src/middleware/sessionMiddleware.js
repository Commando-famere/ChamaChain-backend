// Session Middleware
const { query } = require('../config/database');

// Track active sessions
const activeSessions = new Map();

async function createSession(userId, token) {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    // Deactivate old sessions
    await query(`UPDATE user_sessions SET is_active = false WHERE user_id = $1`, [userId]);
    
    // Create new session
    const result = await query(
        `INSERT INTO user_sessions (user_id, token_hash, session_id, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
         RETURNING id`,
        [userId, tokenHash, require('crypto').randomBytes(32).toString('hex')]
    );
    
    // Track in memory
    activeSessions.set(tokenHash, { userId, sessionId: result.rows[0].id });
    
    return result.rows[0];
}

async function invalidateSession(token) {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    await query(`UPDATE user_sessions SET is_active = false WHERE token_hash = $1`, [tokenHash]);
    activeSessions.delete(tokenHash);
    
    console.log(`Session invalidated: ${tokenHash.substring(0, 10)}...`);
}

async function isSessionActive(token) {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    const result = await query(
        `SELECT is_active FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
    );
    
    return result.rows.length > 0 && result.rows[0].is_active === true;
}

// Cleanup expired sessions every minute
setInterval(async () => {
    const result = await query(
        `UPDATE user_sessions SET is_active = false WHERE expires_at < NOW()`
    );
    if (result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
    }
}, 60000);

module.exports = { createSession, invalidateSession, isSessionActive, activeSessions };
