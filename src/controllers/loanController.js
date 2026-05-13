const { recordActivity } = require('../middleware/inactivityCheck');

// Add to requestLoan function
await recordActivity(chamaId, 'loan_requested', userId);

// Add to approveLoan function
await recordActivity(chamaId, 'loan_approved', userId);

// Add to recordRepayment function
await recordActivity(chamaId, 'loan_repaid', userId);
