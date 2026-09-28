const { pool } = require('../config/database');
const payoutRepository = require('../repositories/payoutRepository');
const payoutAttemptRepository = require('../repositories/payoutAttemptRepository');
const payoutStatusHistoryRepository = require('../repositories/payoutStatusHistoryRepository');
const verifiedBankAccountRepository = require('../repositories/verifiedBankAccountRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const cycleRepository = require('../repositories/cycleRepository');
const ledgerRepository = require('../repositories/ledgerRepository');
const payoutEligibilityService = require('./payoutEligibilityService');
const flutterwaveService = require('./flutterwave.service');
const AppError = require('../utils/appError');
const { decryptAccountNumber } = require('../utils/bankAccountCrypto');
const { toNonNegativeMinorUnits } = require('../utils/money');
const { emitPayoutUpdated } = require('../config/socket');

const PROVIDER = 'FLUTTERWAVE';
const SAFE_PROVIDER_FAILURE = 'The payout provider rejected this transfer.';
const SAFE_PROVIDER_UNKNOWN = 'The payout provider result could not be confirmed. Reconciliation is required.';

const logPayout = (event, metadata = {}) => {
  console.log(JSON.stringify({
    level: 'info',
    event,
    provider: PROVIDER.toLowerCase(),
    timestamp: new Date().toISOString(),
    ...metadata
  }));
};

const safeProviderMetadata = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(safeProviderMetadata);
  return Object.entries(value).reduce((result, [key, item]) => {
    const normalizedKey = key.toLowerCase();
    const sensitiveAccountKey = normalizedKey.includes('account_number') || normalizedKey.includes('accountnumber');
    result[key] = sensitiveAccountKey
      ? '[REDACTED]'
      : safeProviderMetadata(item);
    return result;
  }, {});
};

const normalizeStatus = (status) => String(status || '').trim().toUpperCase();

const toPayout = (payout) => ({
  id: payout.id,
  cooperativeId: payout.cooperative_id,
  cooperativeName: payout.cooperative_name || null,
  cycleId: payout.cycle_id,
  cycleName: payout.cycle_name || null,
  recipientMembershipId: payout.recipient_membership_id,
  recipientName: payout.recipient_name || null,
  recipientEmail: payout.recipient_email || null,
  bankAccountId: payout.bank_account_id,
  bankName: payout.bank_name || null,
  accountNumberMasked: payout.account_number_masked || null,
  amount: Number(payout.amount),
  currency: payout.currency,
  provider: payout.provider,
  providerTransferId: payout.provider_transfer_id || payout.attempt_transfer_id || null,
  providerReference: payout.provider_reference || payout.attempt_reference || null,
  internalReference: payout.internal_reference,
  status: payout.status,
  attemptNumber: payout.attempt_number || null,
  attemptStatus: payout.attempt_status || null,
  failureReason: payout.failure_reason,
  initiatedAt: payout.initiated_at,
  completedAt: payout.completed_at,
  createdAt: payout.created_at,
  updatedAt: payout.updated_at
});

// Group and member screens receive payout progress without provider references,
// failure diagnostics, or internal attempt metadata.
const toScopedPayout = (payout) => ({
  id: payout.id,
  cooperativeId: payout.cooperative_id ?? payout.cooperativeId,
  cooperativeName: payout.cooperative_name || payout.cooperativeName || null,
  cycleId: payout.cycle_id ?? payout.cycleId,
  cycleName: payout.cycle_name || payout.cycleName || null,
  recipientMembershipId: payout.recipient_membership_id ?? payout.recipientMembershipId,
  recipientName: payout.recipient_name || payout.recipientName || null,
  bankName: payout.bank_name || payout.bankName || null,
  accountNumberMasked: payout.account_number_masked || payout.accountNumberMasked || null,
  amount: Number(payout.amount || 0),
  currency: payout.currency,
  status: payout.status === 'SUCCESS' ? 'SUCCESS' : payout.status === 'FAILED' ? 'FAILED' : 'PENDING',
  initiatedAt: payout.initiated_at || payout.initiatedAt,
  completedAt: payout.completed_at || payout.completedAt,
  createdAt: payout.created_at || payout.createdAt,
  updatedAt: payout.updated_at || payout.updatedAt
});

const assertManager = async (cooperativeId, userId, db = pool) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(cooperativeId, userId, db);
  if (!cooperative) throw new AppError('Cooperative not found.', 404);
  return cooperative;
};

const assertEligible = (eligibility) => {
  if (!eligibility.eligible) {
    const first = eligibility.reasons[0];
    throw new AppError('Payout is not eligible.', 409, eligibility.reasons);
  }
};

const recordStatus = async (payoutId, previousStatus, newStatus, reason, db, actorUserId = null, metadata = {}) => {
  if (previousStatus === newStatus) return;
  await payoutStatusHistoryRepository.create({
    payoutId,
    previousStatus,
    newStatus,
    actorUserId,
    reason,
    metadata
  }, db);
};

const getBankForTransfer = async (bankAccountId, membershipId, db = pool, forUpdate = false) => {
  const bank = await verifiedBankAccountRepository.findById(bankAccountId, db, forUpdate);
  if (!bank || String(bank.membership_id) !== String(membershipId) || bank.verification_status !== 'VERIFIED') {
    throw new AppError('Verified recipient bank account is not available.', 409);
  }
  return bank;
};

const statusFromProviderResponse = (response) => {
  const data = response?.data || {};
  const providerStatus = normalizeStatus(data.status);
  if (providerStatus === 'FAILED') return 'FAILED';
  return 'PENDING';
};

const persistProviderInitiation = async (payoutId, attemptId, response) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payout = await payoutRepository.findById(payoutId, connection, true);
    const attempt = await payoutAttemptRepository.findById(attemptId, connection, true);
    if (!payout || !attempt) throw new AppError('Payout attempt was not found.', 404);
    if (payout.status === 'SUCCESS') {
      await connection.commit();
      return payout;
    }

    const providerData = response?.data || {};
    const nextStatus = statusFromProviderResponse(response);
    const updatedAttempt = await payoutAttemptRepository.updateProviderData(attempt.id, {
      providerTransferId: providerData.id ? String(providerData.id) : null,
      status: nextStatus,
      responseMetadata: safeProviderMetadata(response),
      failureReason: nextStatus === 'FAILED' ? SAFE_PROVIDER_FAILURE : null
    }, connection);
    const updatedPayout = await payoutRepository.updateProviderData(payout.id, {
      providerTransferId: providerData.id ? String(providerData.id) : null,
      providerReference: providerData.reference ? String(providerData.reference) : attempt.provider_reference,
      status: nextStatus,
      metadata: safeProviderMetadata(response),
      failureReason: nextStatus === 'FAILED' ? SAFE_PROVIDER_FAILURE : null,
      completedAt: null
    }, connection);
    await recordStatus(payout.id, payout.status, nextStatus, 'Flutterwave transfer request persisted.', connection, null, {
      attemptId: attempt.id,
      providerTransferId: updatedAttempt.provider_transfer_id
    });
    await connection.commit();
    return updatedPayout;
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }
};

const markUnknown = async (payoutId, attemptId, failureReason, responseMetadata = {}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payout = await payoutRepository.findById(payoutId, connection, true);
    const attempt = await payoutAttemptRepository.findById(attemptId, connection, true);
    if (!payout || !attempt) throw new AppError('Payout attempt was not found.', 404);
    if (payout.status !== 'SUCCESS' && payout.status !== 'FAILED') {
      await payoutAttemptRepository.updateProviderData(attempt.id, {
        status: 'UNKNOWN',
        responseMetadata: safeProviderMetadata(responseMetadata),
        failureReason: SAFE_PROVIDER_UNKNOWN
      }, connection);
      await payoutRepository.updateProviderData(payout.id, {
        status: 'RECONCILIATION_REQUIRED',
        metadata: safeProviderMetadata(responseMetadata),
        failureReason: SAFE_PROVIDER_UNKNOWN
      }, connection);
      await recordStatus(payout.id, payout.status, 'RECONCILIATION_REQUIRED', 'Provider transfer state could not be established.', connection, null, { attemptId });
    }
    await connection.commit();
    return payoutRepository.findById(payout.id);
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }
};

// A provider-declared rejection is different from an unknown network outcome:
// the provider did not accept the transfer, so the payout can safely release
// its reservation and become eligible for a controlled retry.
const markFailed = async (payoutId, attemptId, failureReason, responseMetadata = {}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const payout = await payoutRepository.findById(payoutId, connection, true);
    const attempt = await payoutAttemptRepository.findById(attemptId, connection, true);
    if (!payout || !attempt) throw new AppError('Payout attempt was not found.', 404);
    if (payout.status !== 'SUCCESS') {
      await payoutAttemptRepository.updateProviderData(attempt.id, {
        status: 'FAILED',
        responseMetadata: safeProviderMetadata(responseMetadata),
        failureReason: SAFE_PROVIDER_FAILURE
      }, connection);
      await payoutRepository.updateProviderData(payout.id, {
        status: 'FAILED',
        metadata: safeProviderMetadata(responseMetadata),
        failureReason: SAFE_PROVIDER_FAILURE
      }, connection);
      await recordStatus(payout.id, payout.status, 'FAILED', 'Provider rejected the transfer.', connection, null, { attemptId });
    }
    await connection.commit();
    return payoutRepository.findById(payout.id);
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }
};

const dispatchTransfer = async ({ payout, attempt, bank, recipientName }) => {
  try {
    const response = await flutterwaveService.createTransfer({
      accountNumber: decryptAccountNumber(bank.account_number_encrypted),
      bankCode: bank.bank_code,
      amount: payout.amount,
      currency: payout.currency,
      reference: attempt.provider_reference,
      beneficiaryName: recipientName,
      callbackUrl: require('../config/env').flutterwave.transferCallbackUrl
    });
    if (String(response?.status || '').toLowerCase() !== 'success') {
      const error = new Error(response?.message || 'Flutterwave transfer request was rejected.');
      error.providerRejected = true;
      error.providerResponse = response;
      throw error;
    }
    const updated = await persistProviderInitiation(payout.id, attempt.id, response);
    logPayout('payout.provider.accepted', { payoutId: payout.id, attemptId: attempt.id, status: updated.status });
    return toPayout(updated);
  } catch (error) {
    if (error.providerRejected) {
      const failed = await markFailed(
        payout.id,
        attempt.id,
        SAFE_PROVIDER_FAILURE,
        error.providerResponse || {}
      );
      logPayout('payout.provider.failed', {
        payoutId: payout.id,
        attemptId: attempt.id,
        errorCode: error.code || null,
        internalError: error.message
      });
      return toPayout(failed);
    }
    const recovered = await markUnknown(payout.id, attempt.id, SAFE_PROVIDER_UNKNOWN, error.response?.data || {});
    logPayout('payout.provider.unknown', {
      payoutId: payout.id,
      attemptId: attempt.id,
      errorCode: error.code || null,
      internalError: error.message
    });
    return toPayout(recovered);
  }
};

const reserveAndDispatch = async ({ cooperativeId, cycleId, userId, retryPayoutId = null }) => {
  const connection = await pool.getConnection();
  let payout;
  let attempt;
  let bank;
  let recipientName;

  try {
    await connection.beginTransaction();
    await assertManager(cooperativeId, userId, connection);
    const eligibility = await payoutEligibilityService.getEligibility(cooperativeId, cycleId, userId, connection, true);
    assertEligible(eligibility);
    const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId, connection, true);
    const recipient = await groupMembershipRepository.findByIdWithUser(cycle.recipient_membership_id, connection);
    bank = await getBankForTransfer(eligibility.bankAccount.id, cycle.recipient_membership_id, connection, true);
    recipientName = recipient.name;

    payout = await payoutRepository.findByCycleAndRecipient(cycleId, cycle.recipient_membership_id, connection, true);
    if (retryPayoutId && (!payout || String(payout.id) !== String(retryPayoutId))) {
      throw new AppError('Payout retry target does not match this cycle.', 409);
    }
    if (payout && !retryPayoutId) {
      throw new AppError('A payout already exists for this cycle recipient. Use the controlled retry operation after failure.', 409);
    }
    if (payout && payout.status !== 'FAILED') {
      throw new AppError('Only a confirmed failed payout can be retried.', 409);
    }

    const internalReference = payout?.internal_reference || `PAYOUT-AJO-${cooperativeId}-CYCLE-${cycleId}-MEMBER-${cycle.recipient_membership_id}`;
    if (payout) {
      payout = await payoutRepository.prepareRetry(payout.id, {
        amount: eligibility.approvedAmount.toFixed(2),
        bankAccountId: bank.id,
        metadata: { retry: true, requestedBy: userId }
      }, connection);
    } else {
      payout = await payoutRepository.create({
        cooperativeId,
        cycleId,
        recipientMembershipId: cycle.recipient_membership_id,
        bankAccountId: bank.id,
        amount: eligibility.approvedAmount.toFixed(2),
        currency: eligibility.cycle.currency,
        internalReference,
        status: 'INITIATED',
        metadata: { policy: eligibility.policy, requestedBy: userId }
      }, connection);
    }

    await recordStatus(payout.id, retryPayoutId ? 'FAILED' : null, 'INITIATED', retryPayoutId ? 'Controlled retry initiated.' : 'Payout reservation created.', connection, userId);
    const previousAttempt = await payoutAttemptRepository.findLatestByPayoutId(payout.id, connection);
    const attemptNumber = Number(previousAttempt?.attempt_number || 0) + 1;
    const providerReference = `${internalReference}-ATTEMPT-${attemptNumber}`.slice(0, 150);
    attempt = await payoutAttemptRepository.create({
      payoutId: payout.id,
      attemptNumber,
      providerReference,
      requestMetadata: {
        accountNumberMasked: bank.account_number_masked,
        bankCode: bank.bank_code,
        amount: payout.amount,
        currency: payout.currency
      }
    }, connection);
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }

  logPayout('payout.initiated', { payoutId: payout.id, attemptId: attempt.id, amount: payout.amount });
  return dispatchTransfer({ payout, attempt, bank, recipientName });
};

const createPayout = async (cooperativeId, cycleId, userId) => reserveAndDispatch({ cooperativeId, cycleId, userId });

const retryPayout = async (cooperativeId, payoutId, userId) => {
  const existing = await payoutRepository.findById(payoutId);
  if (!existing || String(existing.cooperative_id) !== String(cooperativeId)) throw new AppError('Payout not found.', 404);
  return reserveAndDispatch({ cooperativeId, cycleId: existing.cycle_id, userId, retryPayoutId: payoutId });
};

const processTransferWebhook = async ({ storedEvent, event }) => {
  const providerTransferId = event.transferId || null;
  const providerReference = event.transferReference || event.transactionReference;
  const attempt = await payoutAttemptRepository.findByProviderIdentifiers({
    provider: PROVIDER,
    providerTransferId,
    providerReference
  });
  if (!attempt) {
    logPayout('payout.webhook.unknown', { webhookEventId: storedEvent.id, providerTransferId, providerReference });
    return { processed: false, reconciliationRequired: true, unknown: true };
  }

  let verification;
  try {
    verification = providerTransferId ? await flutterwaveService.getTransfer(providerTransferId) : null;
  } catch (error) {
    await markUnknownFromWebhook(attempt.payout_id, attempt.id, 'Provider transfer verification failed.', { error: error.message });
    return { processed: true, reconciliationRequired: true };
  }

  const providerData = verification?.data || event.transferData || {};
  const providerStatus = normalizeStatus(providerData.status || event.transferStatus);
  const resultStatus = providerStatus === 'SUCCESSFUL' || providerStatus === 'SUCCESS'
    ? 'SUCCESS'
    : providerStatus === 'FAILED' ? 'FAILED' : 'RECONCILIATION_REQUIRED';
  try {
    return await finalizeTransfer({
      payoutId: attempt.payout_id,
      attemptId: attempt.id,
      event,
      providerData,
      resultStatus,
      storedEvent
    });
  } catch (error) {
    await markUnknownFromWebhook(
      attempt.payout_id,
      attempt.id,
      'Provider transfer payload could not be reconciled.',
      { error: error.message }
    );
    return { processed: true, reconciliationRequired: true };
  }
};

const markUnknownFromWebhook = async (payoutId, attemptId, message, metadata) => markUnknown(payoutId, attemptId, message, metadata);

const finalizeTransfer = async ({ payoutId, attemptId, event, providerData, resultStatus, storedEvent }) => {
  const connection = await pool.getConnection();
  let payload;
  let memberUserId;
  try {
    await connection.beginTransaction();
    const payout = await payoutRepository.findById(payoutId, connection, true);
    const attempt = await payoutAttemptRepository.findById(attemptId, connection, true);
    if (!payout || !attempt) throw new AppError('Payout was not found for transfer event.', 404);
    if (payout.status === 'SUCCESS') {
      await connection.commit();
      return { processed: true, duplicate: true, payout };
    }

    const bank = await getBankForTransfer(payout.bank_account_id, payout.recipient_membership_id, connection, true);
    let amountMatches = false;
    try {
      amountMatches = toNonNegativeMinorUnits(String(providerData.amount ?? event.transferAmount ?? '0'))
        === toNonNegativeMinorUnits(String(payout.amount));
    } catch (amountError) {
      amountMatches = false;
    }
    const currencyMatches = String(providerData.currency || event.transferCurrency || '').toUpperCase() === payout.currency;
    const reference = providerData.reference || event.transferReference || event.transactionReference;
    const referenceMatches = !reference || String(reference) === String(attempt.provider_reference) || String(reference) === String(payout.provider_reference);
    const providerBankCode = providerData.account_bank || providerData.bank_code || event.recipientBankCode;
    const providerAccountNumber = providerData.account_number || providerData.accountNumber;
    const bankMatches = !providerBankCode || String(providerBankCode) === String(bank.bank_code);
    const accountMatches = !providerAccountNumber
      || decryptAccountNumber(bank.account_number_encrypted) === String(providerAccountNumber);

    if (!amountMatches || !currencyMatches || !referenceMatches || !bankMatches || !accountMatches) {
      resultStatus = 'RECONCILIATION_REQUIRED';
    }

    const recipient = await groupMembershipRepository.findByIdWithUser(payout.recipient_membership_id, connection);
    memberUserId = recipient?.user_id;
    if (resultStatus === 'SUCCESS') {
      await payoutAttemptRepository.updateProviderData(attempt.id, {
        providerTransferId: providerData.id || event.transferId,
        status: 'SUCCESS',
        responseMetadata: safeProviderMetadata(providerData)
      }, connection);
      const updatedPayout = await payoutRepository.updateProviderData(payout.id, {
        providerTransferId: providerData.id || event.transferId,
        providerReference: reference || attempt.provider_reference,
        status: 'SUCCESS',
        metadata: safeProviderMetadata(providerData),
        completedAt: new Date()
      }, connection);
      await ledgerRepository.create({
        cooperativeId: payout.cooperative_id,
        cycleId: payout.cycle_id,
        membershipId: payout.recipient_membership_id,
        payoutId: payout.id,
        entryType: 'PAYOUT',
        direction: 'DEBIT',
        amount: payout.amount,
        currency: payout.currency,
        reference: `PAYOUT-${payout.id}-${attempt.id}`,
        description: 'Completed payout debit.',
        metadata: { provider: PROVIDER, webhookEventId: storedEvent.id }
      }, connection);
      await recordStatus(payout.id, payout.status, 'SUCCESS', 'Provider transfer verified successfully.', connection, null, { attemptId });
      payload = { payout: toPayout(updatedPayout), event: 'success' };
    } else if (resultStatus === 'FAILED') {
      await payoutAttemptRepository.updateProviderData(attempt.id, {
        providerTransferId: providerData.id || event.transferId,
        status: 'FAILED',
        responseMetadata: safeProviderMetadata(providerData),
        failureReason: SAFE_PROVIDER_FAILURE
      }, connection);
      const updatedPayout = await payoutRepository.updateProviderData(payout.id, {
        providerTransferId: providerData.id || event.transferId,
        providerReference: reference || attempt.provider_reference,
        status: 'FAILED',
        metadata: safeProviderMetadata(providerData),
        failureReason: SAFE_PROVIDER_FAILURE
      }, connection);
      await recordStatus(payout.id, payout.status, 'FAILED', 'Provider transfer failed.', connection, null, { attemptId });
      payload = { payout: toPayout(updatedPayout), event: 'failed' };
    } else {
      await payoutAttemptRepository.updateProviderData(attempt.id, {
        providerTransferId: providerData.id || event.transferId,
        status: 'RECONCILIATION_REQUIRED',
        responseMetadata: safeProviderMetadata(providerData),
        failureReason: 'Provider transfer did not match the expected payout.'
      }, connection);
      const updatedPayout = await payoutRepository.updateProviderData(payout.id, {
        providerTransferId: providerData.id || event.transferId,
        providerReference: reference || attempt.provider_reference,
        status: 'RECONCILIATION_REQUIRED',
        metadata: safeProviderMetadata(providerData),
        failureReason: 'Provider transfer did not match the expected payout.'
      }, connection);
      await recordStatus(payout.id, payout.status, 'RECONCILIATION_REQUIRED', 'Provider transfer did not match the expected payout.', connection, null, { attemptId });
      payload = { payout: toPayout(updatedPayout), event: 'reconciliation_required' };
    }
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }

  emitPayoutUpdated(memberUserId, payload.payout.cooperativeId, payload);
  logPayout('payout.webhook.processed', { payoutId, attemptId, status: payload.payout.status });
  return { processed: true, reconciliationRequired: payload.payout.status === 'RECONCILIATION_REQUIRED', payout: payload.payout };
};

const getForGroup = async (cooperativeId, userId) => {
  await assertManager(cooperativeId, userId);
  return (await payoutRepository.findAllByCooperativeId(cooperativeId)).map(toScopedPayout);
};

const getForUserGroup = async (cooperativeId, userId) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) throw new AppError('Cooperative membership not found.', 404);
  return (await payoutRepository.findAllByMembershipId(membership.id)).map(toScopedPayout);
};

const getForPlatform = async () => (await payoutRepository.findAll()).map(toPayout);

module.exports = {
  createPayout,
  retryPayout,
  processTransferWebhook,
  getForGroup,
  getForUserGroup,
  getForPlatform,
  toPayout,
  toScopedPayout
};
