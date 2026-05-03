const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

// Token verification
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const errorResponse = {
            success: false,
            code: 401,
            message: 'No token provided'
        };
        
        if (req.headers['accept'] === 'application/octet-stream') {
            const { encodeToBinary } = require('../utils/binaryCodec');
            return res.status(401)
                .setHeader('Content-Type', 'application/octet-stream')
                .send(encodeToBinary(errorResponse));
        }
        
        return res.status(401).json(errorResponse);
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user exists
        const userCheck = await query(
            `SELECT id, account_status FROM users WHERE id = $1`,
            [decoded.id]
        );
        
        if (userCheck.rows.length === 0) {
            const errorResponse = { success: false, code: 401, message: 'User not found' };
            
            if (req.headers['accept'] === 'application/octet-stream') {
                const { encodeToBinary } = require('../utils/binaryCodec');
                return res.status(401)
                    .setHeader('Content-Type', 'application/octet-stream')
                    .send(encodeToBinary(errorResponse));
            }
            return res.status(401).json(errorResponse);
        }
        
        if (userCheck.rows[0].account_status !== 'active') {
            const errorResponse = { success: false, code: 403, message: 'Account suspended' };
            
            if (req.headers['accept'] === 'application/octet-stream') {
                const { encodeToBinary } = require('../utils/binaryCodec');
                return res.status(403)
                    .setHeader('Content-Type', 'application/octet-stream')
                    .send(encodeToBinary(errorResponse));
            }
            return res.status(403).json(errorResponse);
        }
        
        req.user = decoded;
        next();
        
    } catch (error) {
        const errorResponse = {
            success: false,
            code: 401,
            message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
        };
        
        if (req.headers['accept'] === 'application/octet-stream') {
            const { encodeToBinary } = require('../utils/binaryCodec');
            return res.status(401)
                .setHeader('Content-Type', 'application/octet-stream')
                .send(encodeToBinary(errorResponse));
        }
        res.status(401).json(errorResponse);
    }
};

const isChairperson = async (req, res, next) => {
    const { chamaId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
        `SELECT id FROM group_members 
         WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
        [chamaId, userId]
    );
    
    if (result.rows.length === 0) {
        const errorResponse = { success: false, code: 403, message: 'Only chairperson can perform this action' };
        
        if (req.headers['accept'] === 'application/octet-stream') {
            const { encodeToBinary } = require('../utils/binaryCodec');
            return res.status(403)
                .setHeader('Content-Type', 'application/octet-stream')
                .send(encodeToBinary(errorResponse));
        }
        return res.status(403).json(errorResponse);
    }
    
    next();
};

const isMemberOfChama = async (req, res, next) => {
    const { chamaId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
        `SELECT id, role FROM group_members 
         WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
        [chamaId, userId]
    );
    
    if (result.rows.length === 0) {
        const errorResponse = { success: false, code: 403, message: 'You are not a member of this chama' };
        
        if (req.headers['accept'] === 'application/octet-stream') {
            const { encodeToBinary } = require('../utils/binaryCodec');
            return res.status(403)
                .setHeader('Content-Type', 'application/octet-stream')
                .send(encodeToBinary(errorResponse));
        }
        return res.status(403).json(errorResponse);
    }
    
    req.memberRole = result.rows[0].role;
    next();
};

module.exports = { verifyToken, isChairperson, isMemberOfChama };
