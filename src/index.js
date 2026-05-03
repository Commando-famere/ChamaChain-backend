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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'ChamaChain API', status: 'running' });
});

// Import route modules
const authRoutes = require('./routes/v1/authRoutes');
const chamaRoutes = require('./routes/v1/chamaRoutes');
const dashboardRoutes = require('./routes/v1/dashboardRoutes');
const meetingRoutes = require('./routes/v1/meetingRoutes');
const chatRoutes = require('./routes/v1/chatRoutes');
const cryptoRoutes = require('./routes/v1/cryptoRoutes');
const inviteRoutes = require('./routes/v1/inviteRoutes');

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chamas', chamaRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/crypto', cryptoRoutes);
app.use('/api/v1/invites', inviteRoutes);

// Test endpoint
app.get('/api/v1/test', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Test: http://localhost:${PORT}/api/v1/test`);
});
