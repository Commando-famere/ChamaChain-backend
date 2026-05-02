// Session Cleanup Service
const { query } = require('../config/database');

async function cleanupExpiredSessions() {
    try {
        const result = await query(
            `DELETE FROM user_sessions 
             WHERE expires_at < NOW() OR is_active = false
             RETURNING id`
        );
        
        if (result.rowCount > 0) {
            console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
        }
        return result.rowCount;
    } catch (error) {
        console.error('Session cleanup error:', error);
        return 0;
    }
}

async function cleanupExpiredInvites() {
    try {
        const result = await query(
            `UPDATE invitations SET status = 'expired' 
             WHERE expires_at < NOW() AND status = 'pending'
             RETURNING id`
        );
        
        if (result.rowCount > 0) {
            console.log(`🧹 Expired ${result.rowCount} invites`);
        }
        return result.rowCount;
    } catch (error) {
        console.error('Invite cleanup error:', error);
        return 0;
    }
}

module.exports = { cleanupExpiredSessions, cleanupExpiredInvites };
