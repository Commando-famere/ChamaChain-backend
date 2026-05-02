const jwt = require('jsonwebtoken');
const { isSessionActive } = require('./sessionMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                code: 401
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                code: 401
            });
        }
        
        // Verify session is active
        const sessionActive = await isSessionActive(token);
        if (!sessionActive) {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please login again.',
                code: 401
            });
        }
        
        req.user = decoded;
        req.token = token;
        next();
        
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error',
            code: 500
        });
    }
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name },
        JWT_SECRET,
        { expiresIn: '5m' }
    );
};

module.exports = { verifyToken, generateToken };
