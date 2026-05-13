// Inactivity Checker Service
// Runs daily to mark inactive chamas

const { query } = require('../config/database');

async function checkInactiveChamas() {
    try {
        const result = await query(
            `UPDATE chamas 
             SET is_active = FALSE, 
                 inactivity_status = 'inactive'
             WHERE last_activity_at < NOW() - INTERVAL '30 days'
               AND plan IN ('members_only', 'full_money')
               AND is_active = TRUE
             RETURNING id, name`
        );
        
        if (result.rows.length > 0) {
            console.log(`🔒 Marked ${result.rows.length} chamas as inactive due to 30 days of no activity`);
            result.rows.forEach(chama => {
                console.log(`   - ${chama.name} (${chama.id})`);
            });
        }
        
        return result.rows.length;
    } catch (error) {
        console.error('Inactivity check error:', error);
        return 0;
    }
}

// Run every hour
if (typeof setInterval !== 'undefined') {
    setInterval(checkInactiveChamas, 60 * 60 * 1000);
    console.log('📅 Inactivity checker scheduled (every hour)');
}

module.exports = { checkInactiveChamas };
