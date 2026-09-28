const { pool } = require('../config/database');
const paymentIdentityRepository = require('../repositories/paymentIdentityRepository');
const paymentIdentityService = require('./paymentIdentityService');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const transactionStatusHistoryRepository = require('../repositories/transactionStatusHistoryRepository');
const obligationRepository = require('../repositories/obligationRepository');
const obligationAllocationRepository = require('../repositories/obligationAllocationRepository');
const ledgerRepository = require('../repositories/ledgerRepository');
const cycleRepository = require('../repositories/cycleRepository');
const AppError = require('../utils/appError');
const { toNonNegativeMinorUnits, toDecimal } = require('../utils/money');
const { emitContributionAllocated } = require('../config/socket');

const PROVIDER = 'FLUTTERWAVE';
const SUCCESSFUL_PROVIDER_STATUSES = new Set(['success', 'successful']);

const logPayment = (event, metadata = {}) => {
  console.log(JSON.stringify({
    level: 'info',
    event,
    provider: PROVIDER.toLowerCase(),
    timestamp: new Date().toISOString(),
    ...metadata
  }));
};

const parseAmount = (value, label = 'Payment amount') => {
  try {
    return toNonNegativeMinorUnits(value);
  } catch (error) {
    throw new AppError(`${label} is invalid.`, 422);
  }
};

// Keep monetary decisions in integer kobo so decimal floating-point rounding
// can never change whether an obligation is marked paid or left outstanding.
const calculateAllocation = ({ paymentAmount, outstandingAmount, existingExcess = '0.00' }) => {
  const payment = parseAmount(paymentAmount);
  const outstanding = parseAmount(outstandingAmount, 'Outstanding amount');
  const priorExcess = parseAmount(existingExcess, 'Existing excess amount');
  const allocated = payment < outstanding ? payment : outstanding;
  const excess = payment - allocated;
  const remaining = outstanding - allocated;

  return {
    amountAllocated: toDecimal(allocated),
    amountExcess: toDecimal(excess),
    amountPaid: toDecimal(allocated),
    amountOutstanding: toDecimal(remaining),
    amountExcessTotal: toDecimal(priorExcess + excess),
    status: excess > 0n
      ? 'EXCESS_PENDING_REVIEW'
      : remaining === 0n
        ? 'PAID'
        : 'PARTIAL'
  };
};

const transition = async (transaction, nextStatus, reason, db) => {
  if (transaction.status === nextStatus) {
    return transaction;
  }

  if (!isValidTransition(transaction.status, nextStatus)) {
    throw new AppError(
      'This payment cannot be updated in its current state.',
      409,
      null,
      'PAYMENT_STATE_CONFLICT'
    );
  }

  const updated = await paymentTransactionRepository.updateStatus(transaction.id, nextStatus, db);
  await transactionStatusHistoryRepository.create({
    paymentTransactionId: transaction.id,
    previousStatus: transaction.status,
    newStatus: nextStatus,
    reason
  }, db);
  return updated;
};

const isValidTransition = (currentStatus, nextStatus) => {
  const allowed = {
    INITIATED: new Set(['PENDING', 'FAILED', 'UNKNOWN', 'RECONCILIATION_REQUIRED']),
    PENDING: new Set(['SUCCESS', 'FAILED', 'UNKNOWN', 'RECONCILIATION_REQUIRED']),
    SUCCESS: new Set(['RECONCILIATION_REQUIRED']),
    FAILED: new Set(),
    UNKNOWN: new Set(['PENDING', 'SUCCESS', 'RECONCILIATION_REQUIRED']),
    RECONCILIATION_REQUIRED: new Set()
  };
  return Boolean(allowed[currentStatus]?.has(nextStatus));
};

const getVerificationData = (verification) => verification?.data || verification || {};

const assertVerifiedPayment = ({ event, identity, verification }) => {
  const verified = getVerificationData(verification);
  const status = String(verified.status || '').toLowerCase();
  if (!SUCCESSFUL_PROVIDER_STATUSES.has(status)) {
    throw new AppError('Flutterwave payment has not been verified as successful.', 422);
  }

  const eventAmount = event.amount === null || event.amount === undefined ? null : parseAmount(event.amount);
  const verifiedAmount = parseAmount(verified.amount ?? event.amount);
  if (eventAmount !== null && eventAmount !== verifiedAmount) {
    throw new AppError('Flutterwave payment amount does not match the webhook.', 422);
  }

  const currency = String(verified.currency || event.currency || identity.currency || 'NGN').toUpperCase();
  if (currency !== String(identity.currency || 'NGN').toUpperCase()) {
    throw new AppError('Flutterwave payment currency does not match the payment identity.', 422);
  }

  const verifiedReference = verified.tx_ref || verified.reference || null;
  if (event.transactionReference && verifiedReference
    && String(event.transactionReference) !== String(verifiedReference)) {
    throw new AppError('Flutterwave payment reference does not match the webhook.', 422);
  }

  if (event.transactionId && verified.id && String(event.transactionId) !== String(verified.id)) {
    throw new AppError('Flutterwave provider transaction does not match the webhook.', 422);
  }

  return {
    amount: toDecimal(verifiedAmount),
    currency,
    providerTransactionId: verified.id || event.transactionId || null,
    // flw_ref identifies the provider payment; data.id remains the provider
    // transaction ID. tx_ref is retained separately for identity matching.
    providerReference: event.providerReference || verified.flw_ref || verifiedReference || null
  };
};

const buildTransactionReference = ({ providerTransactionId, providerReference, eventId }) => (
  providerReference || providerTransactionId || `FLW-EVENT-${eventId}`
);

const processVerifiedPayment = async ({ storedEvent, event, identity, verification }) => {
  if (!identity?.id) {
    throw new AppError('Verified payment context is incomplete.', 422);
  }

  const verifiedPayment = assertVerifiedPayment({ event, identity, verification });
  const transactionReference = buildTransactionReference({
    ...verifiedPayment,
    eventId: storedEvent?.id || event.eventId || 'unknown'
  });
  const connection = await pool.getConnection();
  let transaction = null;
  let allocation = null;
  let ledgerEntry = null;
  let obligation = null;
  let memberUserId = null;

  try {
    await connection.beginTransaction();

    // Lock the identity and resolve its membership inside the same business
    // transaction. The payment identity, not an email or legacy member row,
    // is the boundary that prevents a payment crossing into another Ajo.
    const lockedIdentity = await paymentIdentityRepository.findById(
      identity.id,
      connection,
      true
    );
    const membership = lockedIdentity
      ? await groupMembershipRepository.findByIdWithUser(
        lockedIdentity.cooperative_membership_id,
        connection
      )
      : null;

    if (!lockedIdentity || !membership || lockedIdentity.provider !== PROVIDER) {
      throw new AppError('Payment identity could not be resolved.', 404);
    }
    memberUserId = membership.user_id;

    const providerDuplicate = await paymentTransactionRepository.findByProviderIdentifiers({
      provider: PROVIDER,
      providerTransactionId: verifiedPayment.providerTransactionId,
      providerReference: verifiedPayment.providerReference || transactionReference
    }, connection, true);

    // Checkout tx_ref is the merchant's durable reference. Resolve it inside
    // the same lock so a webhook and redirect cannot create separate attempts.
    const internalReferenceTransaction = event.transactionReference
      ? await paymentTransactionRepository.findByInternalReference(
        event.transactionReference,
        connection,
        true
      )
      : null;

    if (providerDuplicate && internalReferenceTransaction
      && String(providerDuplicate.id) !== String(internalReferenceTransaction.id)) {
      throw new AppError('Flutterwave identifiers resolve to different payment attempts.', 409);
    }

    const duplicate = providerDuplicate || internalReferenceTransaction;

    if (duplicate && (duplicate.status === 'FAILED'
      || duplicate.status === 'RECONCILIATION_REQUIRED'
      || ['ALLOCATED', 'EXCESS_PENDING_REVIEW', 'RECONCILIATION_REQUIRED'].includes(duplicate.allocation_status))) {
      await connection.commit();
      logPayment('payment.processing.duplicate', { transactionId: duplicate.id, transactionReference });
      return { processed: true, duplicate: true, transaction: duplicate };
    }

    if (duplicate && (
      String(duplicate.payment_identity_id) !== String(lockedIdentity.id)
      || String(duplicate.membership_id) !== String(membership.id)
      || String(duplicate.cooperative_id) !== String(membership.cooperative_id)
    )) {
      throw new AppError('Payment attempt does not belong to the resolved Ajo membership.', 409);
    }

    if (duplicate && parseAmount(duplicate.gross_amount) !== parseAmount(verifiedPayment.amount)) {
      throw new AppError('Flutterwave payment amount does not match the checkout attempt.', 422);
    }

    transaction = duplicate || await paymentTransactionRepository.create({
      provider: PROVIDER,
      providerTransactionId: verifiedPayment.providerTransactionId,
      providerReference: verifiedPayment.providerReference || transactionReference,
      paymentIdentityId: lockedIdentity.id,
      membershipId: membership.id,
      cooperativeId: membership.cooperative_id,
      obligationId: null,
      sourceWebhookEventId: storedEvent?.id || null,
      grossAmount: verifiedPayment.amount,
      netAmount: verifiedPayment.amount,
      currency: verifiedPayment.currency,
      internalReference: `PAMOJA-${PROVIDER}-${transactionReference}`.slice(0, 150),
      metadata: {
        eventId: event.eventId || null,
        transactionReference: event.transactionReference || null,
        senderName: event.senderName || null
      }
    }, connection);

    if (!duplicate) {
      await transactionStatusHistoryRepository.create({
        paymentTransactionId: transaction.id,
        previousStatus: null,
        newStatus: 'INITIATED',
        reason: 'Verified provider payment received.'
      }, connection);
    }

    if (transaction && (
      (verifiedPayment.providerTransactionId
        && String(transaction.provider_transaction_id || '') !== String(verifiedPayment.providerTransactionId))
      || (verifiedPayment.providerReference
        && String(transaction.provider_reference || '') !== String(verifiedPayment.providerReference))
      || (storedEvent?.id && !transaction.source_webhook_event_id)
    )) {
      transaction = await paymentTransactionRepository.updateProviderIdentifiers(transaction.id, {
        providerTransactionId: verifiedPayment.providerTransactionId,
        providerReference: verifiedPayment.providerReference,
        sourceWebhookEventId: storedEvent?.id || null
      }, connection);
    }

    if (transaction.status === 'INITIATED') {
      transaction = await transition(transaction, 'PENDING', 'Payment is ready for allocation.', connection);
    }
    if (transaction.status === 'PENDING' || transaction.status === 'UNKNOWN') {
      transaction = await transition(transaction, 'SUCCESS', 'Provider verification succeeded.', connection);
    }

    // Lock the active obligation before calculating the remaining amount. Two
    // concurrent webhook deliveries must serialize on this row.
    if (transaction.obligation_id) {
      obligation = await obligationRepository.findById(transaction.obligation_id, connection, true);
      const cycle = obligation
        ? await cycleRepository.findById(obligation.cycle_id, connection, true)
        : null;

      if (!obligation || !cycle
        || String(obligation.membership_id) !== String(membership.id)
        || String(cycle.cooperative_id) !== String(membership.cooperative_id)) {
        obligation = null;
      }
    } else {
      obligation = await obligationRepository.findActiveByMembership(membership.id, connection, true);
    }
    if (!obligation || String(obligation.membership_id) !== String(membership.id)
      || String(obligation.cooperative_id || membership.cooperative_id) !== String(membership.cooperative_id)) {
      transaction = await transition(
        transaction,
        'RECONCILIATION_REQUIRED',
        'No active contribution obligation was available for this membership.',
        connection
      );
      transaction = await paymentTransactionRepository.updateAllocationStatus(
        transaction.id,
        'RECONCILIATION_REQUIRED',
        connection
      );
      await connection.commit();
      logPayment('payment.processing.reconciliation_required', {
        transactionId: transaction.id,
        membershipId: membership.id,
        reason: 'no_active_obligation'
      });
      return { processed: true, duplicate: false, reconciliationRequired: true, transaction };
    }

    const allocationAmounts = calculateAllocation({
      paymentAmount: verifiedPayment.amount,
      outstandingAmount: obligation.amount_outstanding,
      existingExcess: obligation.amount_excess
    });

    obligation = await obligationRepository.applyPayment(obligation.id, {
      amountPaid: toDecimal(parseAmount(obligation.amount_paid) + parseAmount(allocationAmounts.amountAllocated)),
      amountOutstanding: allocationAmounts.amountOutstanding,
      amountExcess: allocationAmounts.amountExcessTotal,
      status: allocationAmounts.status
    }, connection);

    allocation = await obligationAllocationRepository.create({
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      amountAllocated: allocationAmounts.amountAllocated,
      amountExcess: allocationAmounts.amountExcess,
      currency: verifiedPayment.currency
    }, connection);

    if (parseAmount(allocationAmounts.amountAllocated) > 0n) {
      ledgerEntry = await ledgerRepository.create({
        cooperativeId: membership.cooperative_id,
        cycleId: obligation.cycle_id,
        membershipId: membership.id,
        obligationId: obligation.id,
        paymentTransactionId: transaction.id,
        entryType: 'CONTRIBUTION',
        direction: 'CREDIT',
        amount: allocationAmounts.amountAllocated,
        currency: verifiedPayment.currency,
        reference: `CONTRIBUTION-${transaction.id}-${obligation.id}`,
        description: 'Contribution allocated from verified provider payment.',
        metadata: { provider: PROVIDER }
      }, connection);
    }

    const allocationStatus = allocationAmounts.amountExcess !== '0.00'
      ? 'EXCESS_PENDING_REVIEW'
      : 'ALLOCATED';
    transaction = await paymentTransactionRepository.updateAllocationStatus(
      transaction.id,
      allocationStatus,
      connection
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    logPayment('payment.processing.failed', {
      transactionReference,
      message: error.message
    });
    if (error.code === 'ER_DUP_ENTRY') {
      const concurrent = await paymentTransactionRepository.findByProviderIdentifiers({
        provider: PROVIDER,
        providerTransactionId: verifiedPayment.providerTransactionId,
        providerReference: verifiedPayment.providerReference || transactionReference
      });
      if (concurrent) {
        logPayment('payment.processing.duplicate_race', {
          transactionId: concurrent.id,
          transactionReference
        });
        return { processed: true, duplicate: true, transaction: concurrent };
      }
    }
    throw error;
  } finally {
    connection.release();
  }

  const payload = {
    transactionId: transaction.id,
    transactionReference,
    membershipId: transaction.membership_id,
    cooperativeId: transaction.cooperative_id,
    obligationId: obligation.id,
    amount: transaction.gross_amount,
    amountAllocated: allocation ? allocation.amount_allocated : '0.00',
    amountExcess: allocation ? allocation.amount_excess : '0.00',
    status: transaction.status,
    allocationStatus: transaction.allocation_status,
    ledgerEntryId: ledgerEntry?.id || null
  };
  emitContributionAllocated(memberUserId, transaction.cooperative_id, payload);
  logPayment('payment.processing.completed', payload);

  return { processed: true, duplicate: false, transaction, obligation, allocation, ledgerEntry };
};

// Compatibility entry point for trusted internal callers. Webhook signature
// verification remains outside this service; accountRef resolves the
// group-scoped payment identity and the same atomic allocation engine is used.
const processSuccessfulPayment = async ({
  accountRef,
  amount,
  transactionReference,
  senderName = null,
  narration = null,
  eventId = null
}) => {
  if (!accountRef || !transactionReference) {
    throw new AppError('Payment identity and transaction reference are required.', 422);
  }

  const identity = await paymentIdentityService.resolveWebhookIdentity({
    virtualAccountReference: accountRef,
    accountNumber: accountRef,
    providerReference: accountRef
  });
  if (!identity) {
    throw new AppError('Payment identity was not found.', 404);
  }

  return processVerifiedPayment({
    storedEvent: { id: null },
    event: {
      eventId,
      transactionReference,
      providerReference: transactionReference,
      transactionId: transactionReference,
      amount,
      currency: identity.currency || 'NGN',
      senderName,
      narration
    },
    identity,
    verification: {
      data: {
        status: 'successful',
        id: transactionReference,
        tx_ref: transactionReference,
        amount,
        currency: identity.currency || 'NGN'
      }
    }
  });
};

module.exports = {
  processVerifiedPayment,
  processSuccessfulPayment,
  calculateAllocation,
  isValidTransition
};
