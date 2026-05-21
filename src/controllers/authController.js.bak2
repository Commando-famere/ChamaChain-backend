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
        const { chamaId } = req.query;

        const result = await query(
            `SELECT id, phone, email, full_name, global_user_id, profile_picture_url,
                    bio, date_of_birth, gender, county, town, occupation,
                    emergency_name, emergency_phone, alternative_phone, whatsapp_number,
                    account_status, created_at, updated_at
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 'User not found', 404, 404);
        }

        const profileData = { user: result.rows[0] };

        // If chamaId is provided, include chama-specific info
        if (chamaId) {
            const roleResult = await query(
                `SELECT gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount,
                        c.name as chama_name, c.plan, c.chama_type, c.created_at as chama_created_at
                 FROM group_members gm
                 JOIN chamas c ON gm.chama_id = c.id
                 WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
                [chamaId, userId]
            );

            if (roleResult.rows.length > 0) {
                profileData.chama_role = {
                    chama_id: chamaId,
                    chama_name: roleResult.rows[0].chama_name,
                    chama_type: roleResult.rows[0].chama_type,
                    plan: roleResult.rows[0].plan,
                    role: roleResult.rows[0].role,
                    chama_member_id: roleResult.rows[0].chama_member_id,
                    joined_at: roleResult.rows[0].joined_at,
                    chama_created_at: roleResult.rows[0].chama_created_at,
                    contribution_amount: parseFloat(roleResult.rows[0].regular_contribution_amount) || 0
                };

                // If role is chairperson, add comprehensive stats and data
                if (roleResult.rows[0].role === 'chairperson') {
                    // Get statistics
                    const stats = await query(
                        `SELECT 
                            (SELECT COUNT(*) FROM meeting_minutes WHERE chama_id = $1) as total_meetings,
                            (SELECT COUNT(*) FROM group_members WHERE chama_id = $1 AND is_active = true) as total_members,
                            (SELECT COUNT(*) FROM transaction_ledger WHERE chama_id = $1 AND status = 'approved') as total_transactions,
                            (SELECT COUNT(*) FROM withdrawal_approvals WHERE chama_id = $1 AND status = 'pending') as pending_withdrawals,
                            (SELECT COUNT(*) FROM loans WHERE chama_id = $1 AND status = 'pending') as pending_loans,
                            (SELECT COUNT(*) FROM member_join_requests WHERE chama_id = $1 AND status = 'pending') as pending_members,
                            (SELECT COALESCE(SUM(amount_usdt), 0) FROM member_contributions WHERE chama_id = $1) as total_contributions,
                            (SELECT COUNT(*) FROM chama_disputes WHERE chama_id = $1 AND status = 'pending') as active_disputes
                        `,
                        [chamaId]
                    );

                    // Get recent activities
                    const recentActivities = await query(
                        `SELECT activity_type, description, created_at
                         FROM chama_activity_log
                         WHERE chama_id = $1
                         ORDER BY created_at DESC
                         LIMIT 10`,
                        [chamaId]
                    );

                    // Get upcoming meetings
                    const upcomingMeetings = await query(
                        `SELECT id, title, meeting_date, start_time, location
                         FROM meeting_minutes
                         WHERE chama_id = $1 AND meeting_date >= CURRENT_DATE
                         ORDER BY meeting_date ASC
                         LIMIT 5`,
                        [chamaId]
                    );

                    // Get pending member requests
                    const pendingMembers = await query(
                        `SELECT mjr.id, u.full_name, u.phone, mjr.created_at
                         FROM member_join_requests mjr
                         JOIN users u ON mjr.user_id = u.id
                         WHERE mjr.chama_id = $1 AND mjr.status = 'pending'
                         LIMIT 10`,
                        [chamaId]
                    );

                    // Chairperson permissions
                    const permissions = {
                        can_preside_meetings: true,
                        can_enforce_constitution: true,
                        can_co_sign_transactions: true,
                        can_manage_disputes: true,
                        can_approve_members: true,
                        can_remove_members: true,
                        can_upgrade_plan: true,
                        can_create_votes: true,
                        can_process_payouts: true,
                        can_start_cycles: true,
                        can_assign_roles: true,
                        can_edit_settings: true,
                        can_request_audit: true
                    };

                    profileData.chairperson_data = {
                        statistics: {
                            total_meetings: parseInt(stats.rows[0].total_meetings) || 0,
                            total_members: parseInt(stats.rows[0].total_members) || 0,
                            total_transactions: parseInt(stats.rows[0].total_transactions) || 0,
                            pending_withdrawals: parseInt(stats.rows[0].pending_withdrawals) || 0,
                            pending_loans: parseInt(stats.rows[0].pending_loans) || 0,
                            pending_members: parseInt(stats.rows[0].pending_members) || 0,
                            total_contributions: parseFloat(stats.rows[0].total_contributions) || 0,
                            active_disputes: parseInt(stats.rows[0].active_disputes) || 0
                        },
                        recent_activities: recentActivities.rows,
                        upcoming_meetings: upcomingMeetings.rows,
                        pending_member_requests: pendingMembers.rows,
                        permissions: permissions
                    };
                }
            }
        }

        sendSuccess(res, profileData);
    } catch (error) {
        console.error('Get profile error:', error);
        sendError(res, 'Failed to get profile', 500, 500);
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            full_name, email, bio, date_of_birth, gender,
            county, town, occupation, profile_picture_url,
            emergency_name, emergency_phone, alternative_phone, whatsapp_number
        } = req.body;

        const result = await query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 bio = COALESCE($3, bio),
                 date_of_birth = COALESCE($4, date_of_birth),
                 gender = COALESCE($5, gender),
                 county = COALESCE($6, county),
                 town = COALESCE($7, town),
                 occupation = COALESCE($8, occupation),
                 profile_picture_url = COALESCE($9, profile_picture_url),
                 emergency_name = COALESCE($10, emergency_name),
                 emergency_phone = COALESCE($11, emergency_phone),
                 alternative_phone = COALESCE($12, alternative_phone),
                 whatsapp_number = COALESCE($13, whatsapp_number),
                 updated_at = NOW()
             WHERE id = $14
             RETURNING id, phone, email, full_name, global_user_id, profile_picture_url,
                       bio, date_of_birth, gender, county, town, occupation,
                       emergency_name, emergency_phone, alternative_phone, whatsapp_number,
                       account_status, created_at, updated_at`,
            [
                full_name, email, bio, date_of_birth, gender,
                county, town, occupation, profile_picture_url,
                emergency_name, emergency_phone, alternative_phone, whatsapp_number,
                userId
            ]
        );

        sendSuccess(res, { user: result.rows[0] }, 'Profile updated successfully');
    } catch (error) {
        console.error('Update profile error:', error);
        sendError(res, 'Failed to update profile', 500, 500);
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        const userResult = await query(
            `SELECT password_hash FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return sendError(res, 'User not found', 404, 404);
        }

        const isValid = await comparePassword(current_password, userResult.rows[0].password_hash);
        if (!isValid) {
            return sendError(res, 'Current password is incorrect', 401, 401);
        }

        const hashedPassword = await hashPassword(new_password);

        await query(
            `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
            [hashedPassword, userId]
        );

        sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
        console.error('Change password error:', error);
        sendError(res, 'Failed to change password', 500, 500);
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

module.exports = { register, login, getProfile, logout, refreshToken, updateProfile, changePassword };

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            full_name, email, bio, date_of_birth, gender,
            county, town, occupation, profile_picture_url,
            emergency_name, emergency_phone, alternative_phone, whatsapp_number
        } = req.body;

        const result = await query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 bio = COALESCE($3, bio),
                 date_of_birth = COALESCE($4, date_of_birth),
                 gender = COALESCE($5, gender),
                 county = COALESCE($6, county),
                 town = COALESCE($7, town),
                 occupation = COALESCE($8, occupation),
                 profile_picture_url = COALESCE($9, profile_picture_url),
                 emergency_name = COALESCE($10, emergency_name),
                 emergency_phone = COALESCE($11, emergency_phone),
                 alternative_phone = COALESCE($12, alternative_phone),
                 whatsapp_number = COALESCE($13, whatsapp_number),
                 updated_at = NOW()
             WHERE id = $14
             RETURNING id, phone, email, full_name, global_user_id, profile_picture_url,
                       bio, date_of_birth, gender, county, town, occupation,
                       emergency_name, emergency_phone, alternative_phone, whatsapp_number,
                       account_status, created_at, updated_at`,
            [
                full_name || null, 
                email || null, 
                bio || null, 
                date_of_birth || null, 
                gender || null,
                county || null, 
                town || null, 
                occupation || null, 
                profile_picture_url || null,
                emergency_name || null, 
                emergency_phone || null, 
                alternative_phone || null, 
                whatsapp_number || null,
                userId
            ]
        );

        sendSuccess(res, { user: result.rows[0] }, 'Profile updated successfully');
    } catch (error) {
        console.error('Update profile error:', error);
        sendError(res, 'Failed to update profile: ' + error.message, 500, 500);
    }
};
