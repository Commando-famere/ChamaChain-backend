-- =====================================================
-- SEED 001: ROLES AND PERMISSIONS
-- 16 roles with granular permissions
-- =====================================================

INSERT INTO role_permissions (role_name, can_view_all_members, can_invite_members, can_remove_members, can_assign_roles, can_approve_final_decisions, can_view_all_transactions, can_create_transaction, can_approve_transaction, can_withdraw_funds, can_create_meeting, can_edit_minutes, can_view_audit_logs, can_flag_discrepancy, can_manage_welfare_cases, can_manage_projects) VALUES
-- Leadership
('chairperson', true, true, true, true, true, true, true, true, true, true, true, true, false, true, true),
('vice_chairperson', true, true, false, false, false, true, false, false, false, true, true, true, false, true, true),

-- Secretarial
('secretary', true, false, false, false, false, false, false, false, false, true, true, false, false, false, false),
('assistant_secretary', true, false, false, false, false, false, false, false, false, true, false, false, false, false, false),

-- Finance
('treasurer', true, false, false, false, false, true, true, false, true, false, false, false, false, false, false),
('assistant_treasurer', true, false, false, false, false, true, true, false, false, false, false, false, false, false, false),
('auditor', true, false, false, false, false, true, false, false, false, false, false, true, true, false, false),

-- Management
('trustee', true, true, false, true, false, true, false, false, false, false, false, false, false, false, true),
('organizing_secretary', true, true, false, false, false, false, false, false, false, true, false, false, false, false, true),
('project_coordinator', true, false, false, false, false, false, false, false, false, false, false, false, false, false, true),

-- Welfare & Communications
('welfare_officer', true, false, false, false, false, false, false, false, false, false, false, false, false, true, false),
('publicity_secretary', false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),

-- Members
('member', false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
('patron', true, false, false, false, false, true, false, false, false, false, false, true, false, false, false),
('chief_member', true, false, false, false, false, true, false, false, false, false, false, true, false, false, false)

ON CONFLICT (role_name) DO UPDATE SET
    can_view_all_members = EXCLUDED.can_view_all_members,
    can_invite_members = EXCLUDED.can_invite_members,
    can_remove_members = EXCLUDED.can_remove_members,
    can_assign_roles = EXCLUDED.can_assign_roles,
    can_approve_final_decisions = EXCLUDED.can_approve_final_decisions,
    can_view_all_transactions = EXCLUDED.can_view_all_transactions,
    can_create_transaction = EXCLUDED.can_create_transaction,
    can_approve_transaction = EXCLUDED.can_approve_transaction,
    can_withdraw_funds = EXCLUDED.can_withdraw_funds,
    can_create_meeting = EXCLUDED.can_create_meeting,
    can_edit_minutes = EXCLUDED.can_edit_minutes,
    can_view_audit_logs = EXCLUDED.can_view_audit_logs,
    can_flag_discrepancy = EXCLUDED.can_flag_discrepancy,
    can_manage_welfare_cases = EXCLUDED.can_manage_welfare_cases,
    can_manage_projects = EXCLUDED.can_manage_projects;
