const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { binaryMiddleware, binaryResponse } = require('./utils/binaryCodec');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(binaryMiddleware);  // Parse binary requests
app.use(binaryResponse);     // Send binary responses when requested
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
});
