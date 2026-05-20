const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { createChama, confirmPayment, getUserChamas, getChama } = require('../../controllers/chamaController');

router.use(verifyToken);

// Create chama (may require payment)
router.post('/', createChama);

// Confirm payment and activate chama
router.post('/confirm-payment', confirmPayment);

// Get user's chamas
router.get('/', getUserChamas);

// Get chama details
router.get('/:chamaId', getChama);

module.exports = router;

// Contribution cycles routes
const cycleController = require('../../controllers/cycleController');
router.post('/:chamaId/cycles/start', cycleController.startCycle);
router.post('/:chamaId/contributions', cycleController.recordContribution);
router.post('/:chamaId/cycles/:cycleId/payout', cycleController.processPayout);
router.get('/:chamaId/cycles', cycleController.getCycles);

// Constitution routes
const constitutionController = require('../../controllers/constitutionController');
router.post('/:chamaId/constitution', constitutionController.saveConstitution);
router.post('/:chamaId/constitution/:constitutionId/sign', constitutionController.signConstitution);
router.get('/:chamaId/constitution', constitutionController.getConstitution);

// Voting routes
const voteController = require('../../controllers/voteController');
router.post('/:chamaId/votes', voteController.createVote);
router.post('/:chamaId/votes/:voteId/cast', voteController.castVote);
router.post('/:chamaId/votes/:voteId/close', voteController.closeVote);
router.get('/:chamaId/votes', voteController.getVotes);

// Penalty routes
const penaltyController = require('../../controllers/penaltyController');
router.post('/:chamaId/penalty-rules', penaltyController.createPenaltyRule);
router.post('/:chamaId/penalties', penaltyController.applyPenalty);
router.get('/:chamaId/penalty-rules', penaltyController.getPenaltyRules);

// Bank account routes
const bankController = require('../../controllers/bankController');
router.post('/:chamaId/bank-accounts', bankController.addBankAccount);
router.get('/:chamaId/bank-accounts', bankController.getBankAccounts);
