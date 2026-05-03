const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

// Verify token and attach user to request
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'No token provided. Please login.',
            code: 401
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Verify JWT signature and expiration
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists in database
        const userCheck = await query(
            `SELECT id, account_status FROM users WHERE id = $1`,
            [decoded.id]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Please register.',
                code: 401
            });
        }
        
        if (userCheck.rows[0].account_status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is suspended. Contact support.',
                code: 403
            });
        }
        
        // Attach user to request
        req.user = {
            id: decoded.id,
            phone: decoded.phone,
            full_name: decoded.full_name
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.',
                code: 401
            });
        }
        
        console.error('Token verification error:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token. Please login again.',
            code: 401
        });
    }
};

// Ensure user can only access their own resources
const requireOwnership = (req, res, next) => {
    const requestedUserId = req.params.userId || req.body.user_id || req.query.user_id;
    
    if (requestedUserId && requestedUserId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own data.',
            code: 403
        });
    }
    
    next();
};

// Ensure user is a member of the chama
const isMemberOfChama = async (req, res, next) => {
    const { chamaId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
        `SELECT id, role FROM group_members 
         WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
        [chamaId, userId]
    );
    
    if (result.rows.length === 0) {
        return res.status(403).json({
            success: false,
            message: 'You are not a member of this chama',
            code: 403
        });
    }
    
    req.memberRole = result.rows[0].role;
    next();
};

// Ensure user is chairperson of the chama
const isChairperson = async (req, res, next) => {
    const { chamaId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
        `SELECT id FROM group_members 
         WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
        [chamaId, userId]
    );
    
    if (result.rows.length === 0) {
        return res.status(403).json({
            success: false,
            message: 'Only chairperson can perform this action',
            code: 403
        });
    }
    
    next();
};

module.exports = { verifyToken, requireOwnership, isMemberOfChama, isChairperson };
