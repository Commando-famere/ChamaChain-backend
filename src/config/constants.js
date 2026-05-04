// App Constants

const PLANS = {
    FREE: 'free',
    MEMBERS_ONLY: 'members_only',
    FULL_MONEY: 'full_money'
};

// Pricing (KES)
const SETUP_FEES = {
    free: 0,
    members_only: 50,
    full_money: 50
};

// Withdrawal fees
const WITHDRAWAL_FEE_KES = 25;  // Platform fee
const BYBIT_NETWORK_FEE_USDT = 0.5;  // Bybit charges $0.50

// Withdrawal methods
const WITHDRAWAL_METHODS = {
    BANK: 'bank',
    MOBILE_MONEY: 'mobile_money',
    CRYPTO: 'crypto'
};

const FREE_TIER_MAX_MEMBERS = 10;

const ROLES = [
    'chairperson', 'vice_chairperson', 'secretary', 'assistant_secretary',
    'treasurer', 'assistant_treasurer', 'auditor', 'trustee',
    'member', 'organizing_secretary', 'project_coordinator',
    'welfare_officer', 'publicity_secretary', 'patron', 'chief_member'
];

module.exports = {
    PLANS,
    SETUP_FEES,
    WITHDRAWAL_FEE_KES,
    BYBIT_NETWORK_FEE_USDT,
    WITHDRAWAL_METHODS,
    FREE_TIER_MAX_MEMBERS,
    ROLES
};
