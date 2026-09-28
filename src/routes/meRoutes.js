const express = require('express');
const contributionController = require('../controllers/contributionController');
const paymentTransactionController = require('../controllers/paymentTransactionController');
const payoutController = require('../controllers/payoutController');
const cycleController = require('../controllers/cycleController');
const { authenticate } = require('../middleware/authMiddleware');
const { groupIdValidator } = require('../validators/groupValidators');
const { cycleParamsValidator } = require('../validators/cycleValidators');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);
router.get('/ajo-contributions', contributionController.getMyContributions);
router.get('/ajo-contributions/:groupId', groupIdValidator, contributionController.getMyGroupContributions);
router.get('/ajo-contributions/:groupId/transactions', groupIdValidator, paymentTransactionController.listMyTransactions);
router.get('/ajo-payouts/:groupId', groupIdValidator, payoutController.listMemberPayouts);
router.get('/ajo-cycles/:groupId', groupIdValidator, cycleController.listMemberCycles);
router.get('/ajo-cycles/:groupId/:cycleId', cycleParamsValidator, cycleController.getMemberCycle);

module.exports = router;
