const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Binary parser middleware - FIXED
app.use((req, res, next) => {
    const isBinary = req.headers['content-type'] === 'application/octet-stream';
    
    if (isBinary && req.method !== 'GET') {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            try {
                const jsonString = buffer.toString('utf8');
                req.body = JSON.parse(jsonString);
                req.isBinary = true;
                console.log('✅ Binary parsed:', jsonString.substring(0, 100));
                next();
            } catch (err) {
                console.error('Binary parse error:', err.message);
                res.status(400).json({ success: false, message: 'Invalid binary data' });
            }
        });
    } else {
        next();
    }
});

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'ChamaChain API', status: 'running' });
});

// API routes
app.use('/api/v1', require('./routes'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Binary mode: ENABLED`);
});
