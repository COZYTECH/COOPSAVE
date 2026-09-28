const cycleRepository = require('../repositories/cycleRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const verifiedBankAccountRepository = require('../repositories/verifiedBankAccountRepository');
const payoutRepository = require('../repositories/payoutRepository');
const payoutEligibilityRepository = require('../repositories/payoutEligibilityRepository');
const AppError = require('../utils/appError');
const env = require('../config/env');
const { toNonNegativeMinorUnits, toDecimal } = require('../utils/money');
const { pool } = require('../config/database');

const PENDING_PAYOUT_STATUSES = new Set([
  'DRAFT',
  'ELIGIBLE',
  'INITIATED',
  'PENDING',
  'UNKNOWN',
  'RECONCILIATION_REQUIRED'
]);

const reason = (code, message) => ({ code, message });

const toMinor = (value) => {
  try { return toNonNegativeMinorUnits(value); } catch (error) { return 0n; }
};

const assertManager = async (cooperativeId, userId, db = pool) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(cooperativeId, userId, db);
  if (!cooperative) throw new AppError('Cooperative not found.', 404);
  return cooperative;
};

const getEligibility = async (cooperativeId, cycleId, userId, db = pool, forUpdate = false) => {
  await assertManager(cooperativeId, userId, db);
  const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId, db, forUpdate);
  if (!cycle) throw new AppError('Cycle not found.', 404);

  const reasons = [];
  if (!env.payout.eligibleCycleStatuses.includes(String(cycle.status).toUpperCase())) {
    reasons.push(reason('CYCLE_NOT_ELIGIBLE', `Cycle status ${cycle.status} is not eligible for payout.`));
  }

  const obligations = await payoutEligibilityRepository.getObligationSummary(cycleId, db, forUpdate);
  if (Number(obligations.total_obligations) === 0 || Number(obligations.outstanding_obligations) > 0) {
    reasons.push(reason('CONTRIBUTIONS_OUTSTANDING', 'All required contribution obligations must be satisfied.'));
  }

  let recipient = null;
  let bankAccount = null;
  let existingPayout = null;
  if (!cycle.recipient_membership_id) {
    reasons.push(reason('RECIPIENT_NOT_VERIFIED', 'A payout recipient has not been configured for this cycle.'));
  } else {
    recipient = await groupMembershipRepository.findByIdWithUser(cycle.recipient_membership_id, db);
    if (!recipient || String(recipient.cooperative_id) !== String(cooperativeId)) {
      reasons.push(reason('RECIPIENT_NOT_VERIFIED', 'The configured recipient is not a member of this Ajo.'));
    } else {
      bankAccount = await verifiedBankAccountRepository.findVerifiedByMembershipId(cycle.recipient_membership_id, db, forUpdate);
      if (!bankAccount) {
        reasons.push(reason('RECIPIENT_NOT_VERIFIED', 'The configured recipient has no verified bank account.'));
      }
      existingPayout = await payoutRepository.findByCycleAndRecipient(cycleId, cycle.recipient_membership_id, db, forUpdate);
      if (existingPayout && PENDING_PAYOUT_STATUSES.has(existingPayout.status)) {
        reasons.push(reason('PAYOUT_ALREADY_PENDING', 'A payout is already pending reconciliation for this cycle and recipient.'));
      }
    }
  }

  const reconciliationCount = await payoutEligibilityRepository.getReconciliationCount(cycleId, db, forUpdate);
  if (reconciliationCount > 0) {
    reasons.push(reason('RECONCILIATION_REQUIRED', 'The cycle has payment records awaiting reconciliation.'));
  }

  const accounting = await payoutRepository.getCycleAccounting(cycleId, db, forUpdate);
  const reservedAmount = await payoutRepository.getReservedPayoutAmount(cycleId, db, forUpdate);
  const availableMinor = toMinor(accounting.credits) - toMinor(accounting.debits) - toMinor(reservedAmount);
  if (availableMinor <= 0n) {
    reasons.push(reason('INSUFFICIENT_AVAILABLE_BALANCE', 'No eligible ledger balance is available for payout.'));
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    policy: {
      eligibleCycleStatuses: env.payout.eligibleCycleStatuses,
      recipientSelection: 'EXPLICIT_CYCLE_RECIPIENT',
      amountSource: 'VERIFIED_LEDGER_CREDITS_LESS_RESERVED_DEBITS'
    },
    cycle: {
      id: cycle.id,
      cooperativeId: cycle.cooperative_id,
      name: cycle.name,
      status: cycle.status,
      currency: cycle.currency,
      recipientMembershipId: cycle.recipient_membership_id
    },
    recipient: recipient ? {
      membershipId: recipient.id,
      userId: recipient.user_id,
      name: recipient.name,
      email: recipient.email
    } : null,
    bankAccount: bankAccount ? {
      id: bankAccount.id,
      bankCode: bankAccount.bank_code,
      bankName: bankAccount.bank_name,
      accountNumberMasked: bankAccount.account_number_masked,
      accountName: bankAccount.account_name,
      verificationStatus: bankAccount.verification_status
    } : null,
    obligations: {
      total: Number(obligations.total_obligations || 0),
      outstanding: Number(obligations.outstanding_obligations || 0),
      outstandingAmount: Number(obligations.total_outstanding || 0)
    },
    ledger: {
      credits: Number(accounting.credits || 0),
      completedDebits: Number(accounting.debits || 0),
      reservedPayouts: Number(reservedAmount || 0),
      availableBalance: Number(toDecimal(availableMinor < 0n ? 0n : availableMinor)),
      currency: cycle.currency
    },
    approvedAmount: Number(toDecimal(availableMinor < 0n ? 0n : availableMinor)),
    existingPayout: existingPayout ? {
      id: existingPayout.id,
      status: existingPayout.status,
      amount: Number(existingPayout.amount),
      internalReference: existingPayout.internal_reference
    } : null
  };
};

module.exports = { getEligibility };
