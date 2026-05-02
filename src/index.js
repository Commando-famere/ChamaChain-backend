// ChamaChain - Main Entry Point
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

const { testConnection } = require('./config/database');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

// ============ Middleware ============
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ Routes ============
const routes = require('./routes');

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ name: 'ChamaChain API', version: '1.0.0', status: 'running' });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// ============ Server Start ============
async function startServer() {
    try {
        await testConnection();
        console.log('✅ Database connected');
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log('='.repeat(50));
            console.log('🚀 ChamaChain Server Started');
            console.log('='.repeat(50));
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
