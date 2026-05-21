// Comprehensive Chama Roles Configuration
const ROLES = {
    // Core Leadership Roles
    CHAIRPERSON: 'chairperson',
    SECRETARY: 'secretary',
    TREASURER: 'treasurer',
    
    // Support & Operational Roles
    VICE_CHAIRPERSON: 'vice_chairperson',
    ASSISTANT_SECRETARY: 'assistant_secretary',
    ASSISTANT_TREASURER: 'assistant_treasurer',
    COMMITTEE_MEMBER: 'committee_member',
    
    // Oversight Role
    AUDITOR: 'auditor',
    
    // Specialized Roles
    LOAN_OFFICER: 'loan_officer',
    WELFARE_COORDINATOR: 'welfare_coordinator',
    
    // Basic Member
    MEMBER: 'member'
};

// Role hierarchy (higher number = more authority)
const ROLE_HIERARCHY = {
    chairperson: 10,
    vice_chairperson: 9,
    auditor: 8,
    treasurer: 7,
    secretary: 7,
    assistant_treasurer: 6,
    assistant_secretary: 6,
    committee_member: 5,
    loan_officer: 5,
    welfare_coordinator: 4,
    member: 1
};

// Role-specific permissions
const ROLE_PERMISSIONS = {
    chairperson: {
        level: 'admin',
        can_preside_meetings: true,
        can_enforce_constitution: true,
        can_co_sign_transactions: true,
        can_approve_members: true,
        can_remove_members: true,
        can_upgrade_plan: true,
        can_assign_roles: true,
        can_view_all_finances: true,
        can_approve_loans: true,
        can_request_audit: true,
        can_edit_settings: true,
        can_invite_members: true
    },
    vice_chairperson: {
        level: 'admin',
        can_preside_when_absent: true,
        can_manage_disputes: true,
        can_handle_welfare: true,
        can_co_sign_transactions: true,
        can_view_all_finances: true,
        can_approve_loans: true
    },
    secretary: {
        level: 'officer',
        can_write_minutes: true,
        can_record_attendance: true,
        can_send_notifications: true,
        can_maintain_records: true,
        can_co_sign_transactions: true,
        can_manage_member_register: true,
        can_view_member_details: true
    },
    assistant_secretary: {
        level: 'support',
        can_write_minutes_when_absent: true,
        can_record_attendance: true,
        can_send_notifications: true,
        can_view_member_details: true
    },
    treasurer: {
        level: 'officer',
        can_collect_contributions: true,
        can_manage_bank_account: true,
        can_record_transactions: true,
        can_co_sign_transactions: true,
        can_prepare_financial_reports: true,
        can_view_all_finances: true,
        can_request_payouts: true
    },
    assistant_treasurer: {
        level: 'support',
        can_collect_contributions: true,
        can_assist_financial_records: true,
        can_view_all_finances: true
    },
    committee_member: {
        level: 'committee',
        can_vote_on_decisions: true,
        can_review_financial_records: true,
        can_audit_books: true,
        can_suggest_motions: true
    },
    auditor: {
        level: 'oversight',
        can_review_all_records: true,
        can_audit_transactions: true,
        can_verify_bank_statements: true,
        can_issue_audit_report: true,
        can_independent_review: true
    },
    loan_officer: {
        level: 'specialized',
        can_process_loans: true,
        can_verify_repayment_capacity: true,
        can_track_overdue_loans: true,
        can_review_loan_applications: true
    },
    welfare_coordinator: {
        level: 'specialized',
        can_manage_emergencies: true,
        can_organize_support: true,
        can_distribute_welfare_funds: true,
        can_verify_member_crises: true
    },
    member: {
        level: 'basic',
        can_vote: true,
        can_receive_payouts: true,
        can_request_loans: true,
        can_view_records: true,
        can_attend_meetings: true,
        can_suggest_motions: true
    }
};

// Role-specific registration requirements
const ROLE_REGISTRATION_REQUIREMENTS = {
    chairperson: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'business_name', 'business_reg_number', 'bank_name', 'bank_account', 'tax_id', 'id_photo', 'signature'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone', 'business_name'],
        validations: {
            national_id: { min: 7, max: 8, pattern: '^[0-9]+$' },
            phone: { pattern: '^254[0-9]{9}$' },
            business_reg: { required: false, pattern: '^[A-Z0-9]{10,15}$' }
        }
    },
    vice_chairperson: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        validations: {
            national_id: { min: 7, max: 8, pattern: '^[0-9]+$' },
            phone: { pattern: '^254[0-9]{9}$' }
        }
    },
    secretary: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'whatsapp_number', 'communication_preference'],
        required: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 'whatsapp_number'],
        validations: {
            whatsapp_number: { pattern: '^254[0-9]{9}$' },
            email: { required: true }
        }
    },
    assistant_secretary: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 'whatsapp_number'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        validations: {
            whatsapp_number: { pattern: '^254[0-9]{9}$' }
        }
    },
    treasurer: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'bank_name', 'bank_account', 'bank_branch', 'referee_name', 'referee_phone', 'referee_email'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                   'bank_name', 'bank_account', 'referee_name', 'referee_phone'],
        validations: {
            bank_account: { min: 10, max: 16, pattern: '^[0-9]+$' },
            referee_phone: { pattern: '^254[0-9]{9}$' }
        }
    },
    assistant_treasurer: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'bank_name', 'bank_account'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone', 'bank_name', 'bank_account'],
        validations: {
            bank_account: { min: 10, max: 16, pattern: '^[0-9]+$' }
        }
    },
    committee_member: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 'occupation', 'experience'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        validations: {
            national_id: { min: 7, max: 8, pattern: '^[0-9]+$' }
        }
    },
    auditor: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'qualification', 'certification', 'firm_name'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone', 'qualification'],
        validations: {
            certification: { required: true, pattern: '^[A-Z0-9]{6,15}$' }
        }
    },
    loan_officer: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'banking_experience', 'credit_training'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        validations: {
            banking_experience: { min: 1, max: 50, type: 'years' }
        }
    },
    welfare_coordinator: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone', 
                 'counseling_skills', 'first_aid_certified'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        validations: {
            first_aid_certified: { type: 'boolean' }
        }
    },
    member: {
        fields: ['full_name', 'phone', 'email', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        required: ['full_name', 'phone', 'password', 'national_id', 'emergency_name', 'emergency_phone'],
        validations: {
            national_id: { min: 7, max: 8, pattern: '^[0-9]+$' },
            phone: { pattern: '^254[0-9]{9}$' }
        }
    }
};

// Get role hierarchy
function getRoleHierarchy(role) {
    return ROLE_HIERARCHY[role] || 0;
}

// Check if a role has permission to perform an action
function hasPermission(role, permission) {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return perms[permission] === true;
}

// Get all available roles
function getAllRoles() {
    return Object.values(ROLES);
}

// Get role registration requirements
function getRoleRequirements(role) {
    return ROLE_REGISTRATION_REQUIREMENTS[role] || ROLE_REGISTRATION_REQUIREMENTS.member;
}

// Check if user can assign a role (based on hierarchy)
function canAssignRole(assignerRole, targetRole) {
    const assignerLevel = getRoleHierarchy(assignerRole);
    const targetLevel = getRoleHierarchy(targetRole);
    return assignerLevel > targetLevel;
}

module.exports = {
    ROLES,
    ROLE_PERMISSIONS,
    ROLE_REGISTRATION_REQUIREMENTS,
    getRoleHierarchy,
    hasPermission,
    getAllRoles,
    getRoleRequirements,
    canAssignRole
};
