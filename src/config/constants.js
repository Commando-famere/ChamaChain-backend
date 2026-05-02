// App Constants
module.exports = {
    // Plans
    PLANS: {
        FREE: 'free',
        MEMBERS_ONLY: 'members_only',
        FULL_MONEY: 'full_money'
    },
    
    // Plan Prices (KES)
    PLAN_PRICES: {
        free: 0,
        members_only: 50,
        full_money: 150
    },
    
    // Free tier limits
    FREE_TIER_MAX_MEMBERS: 10,
    
    // Session
    SESSION_EXPIRY_MINUTES: 5,
    HEARTBEAT_INTERVAL_SECONDS: 30,
    
    // Invite
    INVITE_EXPIRY_DAYS: 7,
    
    // Roles
    ROLES: [
        'chairperson', 'vice_chairperson', 'secretary', 'assistant_secretary',
        'treasurer', 'assistant_treasurer', 'auditor', 'trustee',
        'member', 'organizing_secretary', 'project_coordinator',
        'welfare_officer', 'publicity_secretary', 'patron', 'chief_member'
    ],
    
    // Transaction types
    TRANSACTION_TYPES: {
        DEPOSIT: 'deposit',
        WITHDRAWAL: 'withdrawal',
        LOAN_DISBURSEMENT: 'loan_disbursement',
        LOAN_REPAYMENT: 'loan_repayment',
        FINE: 'fine',
        ADJUSTMENT: 'adjustment',
        DIVIDEND: 'dividend',
        REFUND: 'refund',
        TRANSFER: 'transfer'
    },
    
    // Fine types
    FINE_TYPES: {
        LATE_CONTRIBUTION: 'late_contribution',
        ABSENTEE: 'absentee',
        LOAN_LATE: 'loan_late',
        OTHER: 'other'
    },
    
    // Meeting attendance status
    ATTENDANCE_STATUS: {
        PRESENT: 'present',
        ABSENT: 'absent',
        EXCUSED: 'excused',
        LATE: 'late'
    }
};
