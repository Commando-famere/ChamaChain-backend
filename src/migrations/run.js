// Migration Runner
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql') && f !== 'run.js')
        .sort();

    console.log(`Found ${files.length} migration files`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT NOW()
        )
    `);

    for (const file of files) {
        const check = await pool.query('SELECT id FROM migrations WHERE name = $1', [file]);
        
        if (check.rows.length === 0) {
            console.log(`Running: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            try {
                await pool.query(sql);
                await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                console.log(`✅ ${file} completed`);
            } catch (error) {
                console.error(`❌ ${file} failed:`, error.message);
                process.exit(1);
            }
        } else {
            console.log(`⏭️ Skipping ${file}`);
        }
    }

    console.log('✅ All migrations completed');
    await pool.end();
}

if (require.main === module) {
    runMigrations().catch(console.error);
}

module.exports = { runMigrations };
