// Auth Controller
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { hashToken, generateSessionId, getClientIp } = require('../utils/session');
const { sendSuccess, sendError, BUSINESS_CODE, SUCCESS } = require('../utils/responseCodes');

async function hashPassword(password) {
    return await bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

async function createSession(userId, token, userAgent, ipAddress) {
    const tokenHash = hashToken(token);
    const sessionId = generateSessionId();
    
    await query(`UPDATE user_sessions SET is_active = false WHERE user_id = $1`, [userId]);
    
    const result = await query(
        `INSERT INTO user_sessions (user_id, token_hash, session_id, user_agent, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')
         RETURNING id`,
        [userId, tokenHash, sessionId, userAgent, ipAddress]
    );
    
    return result.rows[0];
}

const register = async (req, res) => {
    try {
        const { phone, email, full_name, password } = req.body;
        
        const existingUser = await query(
            `SELECT id FROM users WHERE phone = $1 OR email = $2`,
            [phone, email || null]
        );
        
        if (existingUser.rows.length > 0) {
            return sendError(res, 'User already exists', BUSINESS_CODE.USER_EXISTS, 409);
        }
        
        const hashedPassword = await hashPassword(password);
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        const global_user_id = `USR-${randomNum}`;
        
        const result = await query(
            `INSERT INTO users (phone, email, full_name, password_hash, global_user_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, phone, email, full_name, global_user_id, created_at`,
            [phone, email || null, full_name, hashedPassword, global_user_id]
        );
        
        const user = result.rows[0];
        const token = generateToken(user);
        
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIp(req);
        await createSession(user.id, token, userAgent, ipAddress);
        
        sendSuccess(res, { user, token, session_expires_in: 300 }, 'User registered successfully', SUCCESS.CREATED);
    } catch (error) {
        console.error('Register error:', error);
        sendError(res, 'Registration failed', 500, 500);
    }
};

const login = async (req, res) => {
    try {
        const { phone, email, password } = req.body;
        
        let user;
        if (phone) {
            const result = await query(`SELECT * FROM users WHERE phone = $1`, [phone]);
            user = result.rows[0];
        } else if (email) {
            const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
            user = result.rows[0];
        }
        
        if (!user) {
            return sendError(res, 'Invalid credentials', BUSINESS_CODE.INVALID_CREDENTIALS, 401);
        }
        
        const isValid = await comparePassword(password, user.password_hash);
        
        if (!isValid) {
            return sendError(res, 'Invalid credentials', BUSINESS_CODE.INVALID_CREDENTIALS, 401);
        }
        
        const token = generateToken(user);
        
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIp(req);
        await createSession(user.id, token, userAgent, ipAddress);
        
        sendSuccess(res, {
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                full_name: user.full_name,
                global_user_id: user.global_user_id
            },
            token,
            session_expires_in: 300
        }, 'Login successful');
    } catch (error) {
        console.error('Login error:', error);
        sendError(res, 'Login failed', 500, 500);
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await query(
            `SELECT id, phone, email, full_name, global_user_id, profile_picture_url,
                    bio, date_of_birth, gender, county, town, occupation,
                    emergency_name, emergency_phone, account_status, created_at
             FROM users WHERE id = $1`,
            [userId]
        );
        
        sendSuccess(res, { user: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        sendError(res, 'Failed to get profile', 500, 500);
    }
};

const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const tokenHash = hashToken(token);
            await query(`UPDATE user_sessions SET is_active = false WHERE token_hash = $1`, [tokenHash]);
        }
        
        sendSuccess(res, null, 'Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        sendError(res, 'Logout failed', 500, 500);
    }
};

module.exports = { register, login, getProfile, logout };
