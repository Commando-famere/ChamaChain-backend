// Database Configuration
const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;
        
        if (!databaseUrl) {
            console.error('❌ DATABASE_URL not set');
            return null;
        }
        
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });
    }
    return pool;
}

async function query(text, params) {
    const dbPool = getPool();
    if (!dbPool) {
        throw new Error('Database not configured');
    }
    const start = Date.now();
    try {
        const result = await dbPool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 100) {
            console.log(`Slow query (${duration}ms):`, text.substring(0, 100));
        }
        return result;
    } catch (error) {
        console.error('Query error:', error.message);
        throw error;
    }
}

async function testConnection() {
    try {
        const dbPool = getPool();
        if (!dbPool) return false;
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connected:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('Database pool closed');
    }
}

async function transaction(callback) {
    const dbPool = getPool();
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { query, testConnection, closePool, transaction, getPool };
