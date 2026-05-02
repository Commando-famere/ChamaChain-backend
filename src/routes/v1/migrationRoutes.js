const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

router.post('/add-cancelled-status', async (req, res) => {
    try {
        const pool = new Pool({ 
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        await pool.query(`ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'cancelled'`);
        await pool.end();
        
        res.json({ success: true, message: 'Added cancelled to enum' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
