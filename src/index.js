const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from public directory
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Binary parser middleware
app.use((req, res, next) => {
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
                next();
            } catch (err) {
                res.status(400).json({ success: false, message: 'Invalid binary data' });
            }
        });
    } else {
        next();
    }
});

// Standard middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (ADDED)
app.use(session({
    secret: process.env.SESSION_SECRET || 'chamachain-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware (ADDED)
app.use(passport.initialize());
app.use(passport.session());

// Encryption middleware
const { encryptResponse } = require('./middleware/encryption');
const { checkInactiveChamas } = require('./services/inactivityChecker');
app.use(encryptResponse);

// Run initial inactivity check
checkInactiveChamas().catch(console.error);

// Simple request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
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
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔐 Encryption: ENABLED`);
    console.log(`🖼️ Static files: /images, /uploads`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);
});

// Auto-run migrations on startup
(async () => {
    try {
        const { query } = require('./config/database');
        
        // Create user_sessions table if not exists
        await query(`
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
        
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
        `);
        
        console.log('✅ Session tables ready');
    } catch (error) {
        console.error('Migration error:', error.message);
    }
})();
