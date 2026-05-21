const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Get all members of a chama
const getChamaMembers = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        const memberCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You are not a member of this chama' });
        }
        
        const userRole = memberCheck.rows[0].role;
        const isChairperson = userRole === 'chairperson';
        
        const result = await query(
            `SELECT 
                gm.id as member_id,
                gm.role,
                gm.chama_member_id,
                gm.joined_at,
                u.id as user_id,
                u.full_name,
                u.phone,
                u.email,
                u.global_user_id,
                u.profile_picture_url
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.role = 'chairperson' DESC, gm.joined_at ASC`,
            [chamaId]
        );
        
        let members = result.rows;
        if (!isChairperson) {
            members = members.map(m => ({
                member_id: m.member_id,
                role: m.role,
                chama_member_id: m.chama_member_id,
                joined_at: m.joined_at,
                user: {
                    full_name: m.full_name,
                    global_user_id: m.global_user_id,
                    profile_picture_url: m.profile_picture_url
                }
            }));
        }
        
        res.json({ success: true, data: { members, total: members.length, my_role: userRole, is_chairperson: isChairperson } });
        
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get member details
const getMemberDetails = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;
        
        const memberCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You are not a member of this chama' });
        }
        
        const isChairperson = memberCheck.rows[0].role === 'chairperson';
        
        const result = await query(
            `SELECT 
                gm.id as member_id,
                gm.role,
                gm.chama_member_id,
                gm.joined_at,
                u.id as user_id,
                u.full_name,
                u.phone,
                u.email,
                u.global_user_id,
                u.profile_picture_url,
                u.bio,
                u.date_of_birth,
                u.gender,
                u.county,
                u.town,
                u.occupation
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.id = $1 AND gm.chama_id = $2 AND gm.is_active = true`,
            [memberId, chamaId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        let memberData = result.rows[0];
        if (!isChairperson && memberData.user_id !== userId) {
            memberData = {
                member_id: memberData.member_id,
                role: memberData.role,
                chama_member_id: memberData.chama_member_id,
                joined_at: memberData.joined_at,
                user: {
                    full_name: memberData.full_name,
                    global_user_id: memberData.global_user_id,
                    profile_picture_url: memberData.profile_picture_url,
                    bio: memberData.bio
                }
            };
        }
        
        res.json({ success: true, data: memberData });
        
    } catch (error) {
        console.error('Get member details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update member role
const updateMemberRole = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;
        const { new_role } = req.body;
        
        const validRoles = ['member', 'treasurer', 'assistant_treasurer', 'secretary', 'vice_chairperson', 'auditor'];
        
        if (!validRoles.includes(new_role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        
        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );
        
        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can update member roles' });
        }
        
        const targetMember = await query(
            `SELECT role FROM group_members WHERE id = $1 AND chama_id = $2`,
            [memberId, chamaId]
        );
        
        if (targetMember.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        if (targetMember.rows[0].role === 'chairperson') {
            return res.status(403).json({ success: false, message: 'Cannot change chairperson role' });
        }
        
        await query(`UPDATE group_members SET role = $1 WHERE id = $2`, [new_role, memberId]);
        
        await recordActivity(chamaId, 'member_role_updated', userId);
        
        res.json({ success: true, message: `Member role updated to ${new_role}`, data: { member_id: memberId, new_role } });
        
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove member
const removeMember = async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;
        
        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );
        
        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can remove members' });
        }
        
        const targetMember = await query(
            `SELECT user_id, role FROM group_members WHERE id = $1 AND chama_id = $2`,
            [memberId, chamaId]
        );
        
        if (targetMember.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        if (targetMember.rows[0].user_id === userId) {
            return res.status(403).json({ success: false, message: 'Chairperson cannot remove themselves' });
        }
        
        if (targetMember.rows[0].role === 'chairperson') {
            return res.status(403).json({ success: false, message: 'Cannot remove the chairperson' });
        }
        
        await query(`UPDATE group_members SET is_active = false WHERE id = $1`, [memberId]);
        
        await recordActivity(chamaId, 'member_removed', userId);
        
        res.json({ success: true, message: 'Member removed from chama' });
        
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getChamaMembers, getMemberDetails, updateMemberRole, removeMember };

// Get all members with their roles (for chairperson)
const getAllMembers = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        // Check if user is chairperson
        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can view all members' });
        }

        const members = await query(
            `SELECT u.id, u.full_name, u.phone, u.email, u.profile_picture_url,
                    gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount,
                    COALESCE(mb.balance_usdt, 0) as balance
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN member_balances mb ON mb.member_id = u.id AND mb.chama_id = gm.chama_id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.role = 'chairperson' DESC, gm.joined_at ASC`,
            [chamaId]
        );

        res.json({ success: true, data: members.rows, total: members.rows.length });
    } catch (error) {
        console.error('Get all members error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
