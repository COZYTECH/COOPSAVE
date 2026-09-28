const express = require('express');
const groupController = require('../controllers/groupController');
const paymentIdentityController = require('../controllers/paymentIdentityController');
const cycleController = require('../controllers/cycleController');
const paymentTransactionController = require('../controllers/paymentTransactionController');
const bankAccountController = require('../controllers/bankAccountController');
const payoutEligibilityController = require('../controllers/payoutEligibilityController');
const payoutController = require('../controllers/payoutController');
const paymentCheckoutController = require('../controllers/paymentCheckoutController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireGroupRole } = require('../middleware/groupAuthorization');
const { groupIdValidator } = require('../validators/groupValidators');
const { cycleParamsValidator, createCycleValidator, previewCycleValidator, recipientValidator } = require('../validators/cycleValidators');
const { verifyBankAccountValidator } = require('../validators/bankAccountValidators');
const { payoutCycleParamsValidator, payoutRetryValidator } = require('../validators/payoutValidators');
const { checkoutParamsValidator } = require('../validators/checkoutValidators');
const { authenticatedApiLimiter, paymentLimiter, payoutLimiter, bankVerifyLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);

router.post(
  '/:groupId/obligations/:obligationId/checkout',
  checkoutParamsValidator,
  paymentLimiter,
  requireGroupRole(),
  paymentCheckoutController.createCheckout
);

router.get(
  '/:groupId/cycles',
  groupIdValidator,
  requireGroupRole(),
  cycleController.listCycles
);
router.post(
  '/:groupId/cycles',
  createCycleValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.createCycle
);
router.post(
  '/:groupId/cycles/preview',
  previewCycleValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.previewCycle
);
router.get(
  '/:groupId/cycles/:cycleId',
  cycleParamsValidator,
  requireGroupRole(),
  cycleController.getCycle
);
router.post(
  '/:groupId/cycles/:cycleId/start',
  cycleParamsValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.startCycle
);
router.delete(
  '/:groupId/cycles/:cycleId',
  cycleParamsValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.deleteCycle
);
router.patch(
  '/:groupId/cycles/:cycleId/cancel',
  cycleParamsValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.cancelCycle
);
router.patch(
  '/:groupId/cycles/:cycleId/recipient',
  recipientValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.setRecipient
);
router.get(
  '/:groupId/cycles/:cycleId/payout-eligibility',
  payoutCycleParamsValidator,
  requireGroupRole('GROUP_ADMIN'),
  payoutEligibilityController.getEligibility
);
router.post(
  '/:groupId/cycles/:cycleId/payouts',
  payoutCycleParamsValidator,
  payoutLimiter,
  requireGroupRole('GROUP_ADMIN'),
  payoutController.createPayout
);
router.get(
  '/:groupId/payouts',
  groupIdValidator,
  requireGroupRole('GROUP_ADMIN'),
  payoutController.listGroupPayouts
);
router.post(
  '/:groupId/payouts/:payoutId/retry',
  payoutRetryValidator,
  payoutLimiter,
  requireGroupRole('GROUP_ADMIN'),
  payoutController.retryPayout
);
router.get(
  '/:groupId/bank-accounts',
  groupIdValidator,
  requireGroupRole(),
  bankAccountController.listMyAccounts
);
router.post(
  '/:groupId/bank-accounts/verify',
  groupIdValidator,
  verifyBankAccountValidator,
  bankVerifyLimiter,
  requireGroupRole(),
  bankAccountController.verifyMyAccount
);
router.get(
  '/:groupId/obligations',
  groupIdValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.listGroupObligations
);
router.get(
  '/:groupId/transactions',
  groupIdValidator,
  requireGroupRole('GROUP_ADMIN'),
  paymentTransactionController.listGroupTransactions
);
router.get(
  '/:groupId/cycles/:cycleId/obligations',
  cycleParamsValidator,
  requireGroupRole('GROUP_ADMIN'),
  cycleController.listCycleObligations
);

router.get(
  '/:groupId/manage/payment-identities',
  groupIdValidator,
  requireGroupRole('GROUP_ADMIN'),
  paymentIdentityController.listPaymentIdentities
);
router.get(
  '/:groupId/payment-identity',
  groupIdValidator,
  requireGroupRole(),
  paymentIdentityController.getMyPaymentIdentity
);
router.post(
  '/:groupId/payment-identity/provision',
  groupIdValidator,
  requireGroupRole(),
  paymentIdentityController.provisionMyPaymentIdentity
);

router.get(
  '/:groupId/manage/members',
  groupIdValidator,
  requireGroupRole('GROUP_ADMIN'),
  groupController.getManagedMembers
);
router.get(
  '/:groupId/manage',
  groupIdValidator,
  requireGroupRole('GROUP_ADMIN'),
  groupController.getGroup
);
router.get(
  '/:groupId',
  groupIdValidator,
  requireGroupRole(),
  groupController.getGroup
);

module.exports = router;
