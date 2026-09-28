const payoutEligibilityService = require('../services/payoutEligibilityService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const reasonMessages = Object.freeze({
  CYCLE_NOT_ELIGIBLE: 'This cycle is not ready for payout.',
  CONTRIBUTIONS_OUTSTANDING: 'Some member contributions are still outstanding.',
  RECIPIENT_NOT_VERIFIED: 'Configure a verified recipient and bank account.',
  PAYOUT_ALREADY_PENDING: 'A payout is already being processed for this cycle.',
  RECONCILIATION_REQUIRED: 'Payout is pending payment verification.',
  INSUFFICIENT_AVAILABLE_BALANCE: 'There is no available balance for payout.'
});

const toGroupEligibility = (eligibility) => ({
  eligible: eligibility.eligible,
  reasons: eligibility.reasons.map((item) => ({
    code: item.code === 'RECONCILIATION_REQUIRED' ? 'PAYMENT_VERIFICATION_PENDING' : item.code,
    message: reasonMessages[item.code] || 'Payout is not ready yet.'
  })),
  cycle: eligibility.cycle,
  recipient: eligibility.recipient,
  bankAccount: eligibility.bankAccount,
  obligations: eligibility.obligations,
  ledger: eligibility.ledger,
  approvedAmount: eligibility.approvedAmount,
  existingPayout: eligibility.existingPayout
    ? {
      id: eligibility.existingPayout.id,
      status: eligibility.existingPayout.status === 'SUCCESS'
        ? 'SUCCESS'
        : eligibility.existingPayout.status === 'FAILED' ? 'FAILED' : 'PENDING',
      amount: eligibility.existingPayout.amount
    }
    : null
});

const getEligibility = asyncHandler(async (req, res) => {
  const eligibility = await payoutEligibilityService.getEligibility(
    req.params.groupId,
    req.params.cycleId,
    req.user.id
  );
  return apiResponse.success(res, 200, 'Payout eligibility retrieved.', toGroupEligibility(eligibility));
});

module.exports = { getEligibility };
