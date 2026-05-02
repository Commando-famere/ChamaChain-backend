// Chama Controller
const { query } = require('../config/database');
const MemberModel = require('../models/memberModel');
const { sendSuccess, sendError, BUSINESS_CODE } = require('../utils/responseCodes');
const { PLANS } = require('../config/constants');

const createChama = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, plan = PLANS.FREE, settings = {} } = req.body;
        
        const chamaResult = await query(
            `INSERT INTO chamas (name, plan, created_by, settings)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, plan, created_at`,
            [name, plan, userId, settings]
        );
        
        const chama = chamaResult.rows[0];
        
        const member = await MemberModel.addToChama(chama.id, userId, 'chairperson', null);
        
        sendSuccess(res, { chama, member }, 'Chama created successfully', 201);
    } catch (error) {
        console.error('Create chama error:', error);
        sendError(res, 'Failed to create chama', 500, 500);
    }
};

const getChama = async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const chamaResult = await query(
            `SELECT c.*, COUNT(gm.id) as member_count
             FROM chamas c
             LEFT JOIN group_members gm ON c.id = gm.chama_id AND gm.is_active = true
             WHERE c.id = $1
             GROUP BY c.id`,
            [chamaId]
        );
        
        if (chamaResult.rows.length === 0) {
            return sendError(res, 'Chama not found', BUSINESS_CODE.CHAMA_NOT_FOUND, 404);
        }
        
        sendSuccess(res, { chama: chamaResult.rows[0] });
    } catch (error) {
        console.error('Get chama error:', error);
        sendError(res, 'Failed to get chama', 500, 500);
    }
};

const getUserChamas = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const chamas = await query(
            `SELECT c.id, c.name, c.plan, c.created_at,
                    gm.role, gm.chama_member_id, gm.joined_at
             FROM chamas c
             JOIN group_members gm ON c.id = gm.chama_id
             WHERE gm.user_id = $1 AND gm.is_active = true
             ORDER BY gm.joined_at DESC`,
            [userId]
        );
        
        sendSuccess(res, chamas.rows);
    } catch (error) {
        console.error('Get user chamas error:', error);
        sendError(res, 'Failed to get chamas', 500, 500);
    }
};

const upgradePlan = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { new_plan } = req.body;
        
        if (![PLANS.MEMBERS_ONLY, PLANS.FULL_MONEY].includes(new_plan)) {
            return sendError(res, 'Invalid plan', 400, 400);
        }
        
        await query(`UPDATE chamas SET plan = $1, updated_at = NOW() WHERE id = $2`, [new_plan, chamaId]);
        
        const amount = new_plan === PLANS.MEMBERS_ONLY ? 50 : 150;
        await query(
            `UPDATE subscriptions SET plan = $1, amount_kes = $2 WHERE chama_id = $3`,
            [new_plan, amount, chamaId]
        );
        
        sendSuccess(res, { plan: new_plan, amount_kes: amount }, `Chama upgraded to ${new_plan}`);
    } catch (error) {
        console.error('Upgrade plan error:', error);
        sendError(res, 'Failed to upgrade plan', 500, 500);
    }
};

module.exports = { createChama, getChama, getUserChamas, upgradePlan };
