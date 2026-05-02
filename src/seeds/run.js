// Seed Runner
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runSeeds() {
    const seedsDir = __dirname;
    const files = fs.readdirSync(seedsDir)
        .filter(f => f.endsWith('.sql') && f !== 'run.js')
        .sort();

    console.log(`Found ${files.length} seed files`);

    for (const file of files) {
        console.log(`Running seed: ${file}`);
        const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
        
        try {
            await pool.query(sql);
            console.log(`✅ ${file} completed`);
        } catch (error) {
            console.error(`❌ ${file} failed:`, error.message);
        }
    }

    console.log('✅ All seeds completed');
    await pool.end();
}

if (require.main === module) {
    runSeeds().catch(console.error);
}

module.exports = { runSeeds };
