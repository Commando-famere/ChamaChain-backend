const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Binary parser middleware (MUST come before other middleware)
app.use((req, res, next) => {
    // Skip GET requests
    if (req.method === 'GET') {
        return next();
    }
    
    const contentType = req.headers['content-type'];
    const isBinary = contentType === 'application/octet-stream';
    
    if (isBinary) {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            try {
                const jsonString = buffer.toString('utf8');
                req.body = JSON.parse(jsonString);
                req.isBinary = true;
                console.log('📦 Binary request parsed successfully');
                next();
            } catch (err) {
                console.error('❌ Binary parse error:', err.message);
                res.status(400).json({ success: false, message: 'Invalid binary data' });
            }
        });
    } else {
        // For non-binary, use express.json later
        next();
    }
});

// Standard middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'ChamaChain API', status: 'running' });
});

app.use('/api/v1', require('./routes'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔐 Binary mode: ENABLED`);
});

// Encryption middleware (add after CORS)
const { encryptResponse } = require('./middleware/encryption');
app.use(encryptResponse);
