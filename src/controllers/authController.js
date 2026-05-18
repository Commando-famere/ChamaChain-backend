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
        const { 
            phone, 
            email, 
            full_name, 
            password,
            national_id,
            emergency_name,
            emergency_phone,
            date_of_birth,
            gender,
            county,
            town,
            occupation
        } = req.body;

        // Check if user exists
        const existingUser = await query(
            `SELECT id FROM users WHERE phone = $1 OR email = $2`,
            [phone, email || null]
        );

        if (existingUser.rows.length > 0) {
            return sendError(res, 'User already exists', BUSINESS_CODE.USER_EXISTS, 409);
        }

        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Generate unique user ID
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        const global_user_id = `USR-${randomNum}`;

        // Insert user with only columns that exist
        const result = await query(
            `INSERT INTO users (
                phone, email, full_name, password_hash, global_user_id,
                national_id, emergency_name, emergency_phone,
                date_of_birth, gender, county, town, occupation,
                account_status, created_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
             RETURNING id, phone, email, full_name, global_user_id`,
            [
                phone, email || null, full_name, hashedPassword, global_user_id,
                national_id || null, emergency_name || null, emergency_phone || null,
                date_of_birth || null, gender || null, county || null, town || null, occupation || null,
                'active'
            ]
        );

        const user = result.rows[0];
        const token = generateToken(user);

        // Create session
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIp(req);
        await createSession(user.id, token, userAgent, ipAddress);

        sendSuccess(res, { user, token, session_expires_in: 300 }, 'User registered successfully', SUCCESS.CREATED);
    } catch (error) {
        console.error('Register error:', error);
        sendError(res, 'Registration failed: ' + error.message, 500, 500);
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

const refreshToken = async (req, res) => {
    try {
        const oldToken = req.headers.authorization?.split(' ')[1];
        
        if (!oldToken) {
            return sendError(res, 'No token provided', 401, 401);
        }
        
        const tokenHash = hashToken(oldToken);
        
        const session = await query(
            `SELECT user_id, expires_at, is_active 
             FROM user_sessions 
             WHERE token_hash = $1 AND is_active = true`,
            [tokenHash]
        );
        
        if (session.rows.length === 0) {
            return sendError(res, 'Invalid session', 401, 401);
        }
        
        const sessionData = session.rows[0];
        
        if (new Date() > new Date(sessionData.expires_at)) {
            await query(`UPDATE user_sessions SET is_active = false WHERE token_hash = $1`, [tokenHash]);
            return sendError(res, 'Session expired, please login again', 401, 401);
        }
        
        const userResult = await query(
            `SELECT id, phone, email, full_name, global_user_id FROM users WHERE id = $1`,
            [sessionData.user_id]
        );
        
        const user = userResult.rows[0];
        const newToken = generateToken(user);
        const newTokenHash = hashToken(newToken);
        const newSessionId = generateSessionId();
        
        await query(`UPDATE user_sessions SET is_active = false WHERE token_hash = $1`, [tokenHash]);
        
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIp(req);
        
        await query(
            `INSERT INTO user_sessions (user_id, token_hash, session_id, user_agent, ip_address, expires_at)
             VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')`,
            [user.id, newTokenHash, newSessionId, userAgent, ipAddress]
        );
        
        sendSuccess(res, { 
            token: newToken, 
            session_expires_in: 300,
            session_id: newSessionId
        }, 'Token refreshed successfully');
        
    } catch (error) {
        console.error('Refresh error:', error);
        sendError(res, 'Token refresh failed', 500, 500);
    }
};

module.exports = { register, login, getProfile, logout, refreshToken };
