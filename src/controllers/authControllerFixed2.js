const getChamaProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chamaId } = req.params;

        if (!chamaId) {
            return sendError(res, 'chamaId is required', 400, 400);
        }

        const userResult = await query(
            `SELECT id, phone, email, full_name, global_user_id, profile_picture_url,
                    bio, date_of_birth, gender, county, town, occupation,
                    emergency_name, emergency_phone, account_status, created_at
             FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return sendError(res, 'User not found', 404, 404);
        }

        const memberResult = await query(
            `SELECT gm.role, gm.chama_member_id, gm.joined_at, gm.regular_contribution_amount,
                    c.name as chama_name, c.plan, c.chama_type, c.created_at as chama_created_at,
                    c.is_active as chama_active
             FROM group_members gm
             JOIN chamas c ON gm.chama_id = c.id
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true`,
            [chamaId, userId]
        );

        if (memberResult.rows.length === 0) {
            return sendError(res, 'You are not a member of this chama', 403, 403);
        }

        const member = memberResult.rows[0];
        const profileData = {
            user: userResult.rows[0],
            chama_role: {
                chama_id: chamaId,
                chama_name: member.chama_name,
                chama_type: member.chama_type,
                plan: member.plan,
                role: member.role,
                chama_member_id: member.chama_member_id,
                joined_at: member.joined_at,
                chama_created_at: member.chama_created_at,
                is_active: member.chama_active,
                contribution_amount: parseFloat(member.regular_contribution_amount) || 0
            }
        };

        if (member.role === 'chairperson') {
            // Fix: Use single quotes inside double-quoted string
            const stats = await query(
                `SELECT 
                    (SELECT COUNT(*) FROM meeting_minutes WHERE chama_id = $1) as total_meetings,
                    (SELECT COUNT(*) FROM group_members WHERE chama_id = $1 AND is_active = true) as total_members,
                    (SELECT COUNT(*) FROM withdrawal_approvals WHERE chama_id = $1 AND status = 'pending') as pending_withdrawals,
                    (SELECT COUNT(*) FROM loans WHERE chama_id = $1 AND status = 'pending') as pending_loans,
                    (SELECT COUNT(*) FROM member_join_requests WHERE chama_id = $1 AND status = 'pending') as pending_members,
                    (SELECT COUNT(*) FROM chama_disputes WHERE chama_id = $1 AND status = 'pending') as active_disputes
                `,
                [chamaId]
            );

            const recentActivities = await query(
                `SELECT activity_type, description, created_at
                 FROM chama_activity_log
                 WHERE chama_id = $1
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [chamaId]
            );

            const upcomingMeetings = await query(
                `SELECT id, title, meeting_date, start_time, location
                 FROM meeting_minutes
                 WHERE chama_id = $1 AND meeting_date >= CURRENT_DATE
                 ORDER BY meeting_date ASC
                 LIMIT 5`,
                [chamaId]
            );

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
                can_edit_settings: true
            };

            profileData.chairperson_stats = {
                statistics: {
                    total_meetings: parseInt(stats.rows[0].total_meetings) || 0,
                    total_members: parseInt(stats.rows[0].total_members) || 0,
                    pending_withdrawals: parseInt(stats.rows[0].pending_withdrawals) || 0,
                    pending_loans: parseInt(stats.rows[0].pending_loans) || 0,
                    pending_members: parseInt(stats.rows[0].pending_members) || 0,
                    active_disputes: parseInt(stats.rows[0].active_disputes) || 0
                },
                recent_activities: recentActivities.rows,
                upcoming_meetings: upcomingMeetings.rows,
                permissions: permissions
            };
        }

        sendSuccess(res, profileData);
    } catch (error) {
        console.error('Get chama profile error:', error);
        sendError(res, 'Failed to get chama profile: ' + error.message, 500, 500);
    }
};
