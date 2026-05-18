const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    console.log('Creating user_sessions table...');
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                session_id TEXT NOT NULL UNIQUE,
                user_agent TEXT,
                ip_address TEXT,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table created');
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
        `);
        console.log('✅ Indexes created');
        
        console.log('🎉 Migration complete!');
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

run();
