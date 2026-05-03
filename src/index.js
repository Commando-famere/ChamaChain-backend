const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ============ BINARY PARSER (MUST BE FIRST) ============
app.use((req, res, next) => {
    // Skip for GET requests
    if (req.method === 'GET') {
        return next();
    }
    
    const isBinary = req.headers['content-type'] === 'application/octet-stream';
    
    if (isBinary) {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            try {
                const jsonString = buffer.toString('utf8');
                req.body = JSON.parse(jsonString);
                req.isBinary = true;
                console.log('📦 Binary parsed:', jsonString.substring(0, 100));
                next();
            } catch (err) {
                console.error('❌ Binary parse error:', err.message);
                res.status(400).json({ success: false, message: 'Invalid binary data' });
            }
        });
    } else {
        // For JSON requests, use express.json() later
        next();
    }
});

// ============ STANDARD MIDDLEWARE ============
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ ROUTES ============
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'ChamaChain API', status: 'running' });
});

// API routes
app.use('/api/v1', require('./routes'));

// ============ START SERVER ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔐 Binary mode: ENABLED`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);
});
