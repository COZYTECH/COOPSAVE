const express = require('express');
const reconciliationController = require('../controllers/reconciliationController');
const paymentIdentityController = require('../controllers/paymentIdentityController');
const paymentTransactionController = require('../controllers/paymentTransactionController');
const payoutController = require('../controllers/payoutController');
const financialAccountController = require('../controllers/financialAccountController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePlatformAdmin } = require('../middleware/roleMiddleware');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter, requirePlatformAdmin);
router.get('/payment-identities', paymentIdentityController.listAllPaymentIdentities);
router.get('/reconciliation', reconciliationController.getReconciliation);
router.get('/payment-transactions', paymentTransactionController.listPlatformTransactions);
router.get('/payouts', payoutController.listPlatformPayouts);
router.get('/financial-accounts', financialAccountController.listFinancialAccounts);
router.get('/financial-accounts/:groupId/cycles/:cycleId', financialAccountController.getFinancialAccount);
router.get('/financial-accounts/:groupId', financialAccountController.getFinancialAccount);

module.exports = router;
