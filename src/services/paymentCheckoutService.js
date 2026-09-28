const crypto = require('crypto');
const { pool } = require('../config/database');
const env = require('../config/env');
const paymentIdentityRepository = require('../repositories/paymentIdentityRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const transactionStatusHistoryRepository = require('../repositories/transactionStatusHistoryRepository');
const obligationRepository = require('../repositories/obligationRepository');
const cycleRepository = require('../repositories/cycleRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const flutterwaveService = require('./flutterwave.service');
const { logFlutterwaveEvent } = require('../config/flutterwave');
const paymentProcessingService = require('./paymentProcessingService');
const AppError = require('../utils/appError');
const { toNonNegativeMinorUnits, toDecimal } = require('../utils/money');

const PROVIDER = 'FLUTTERWAVE';

const buildTransactionReference = (obligationId) => (
  `PAMOJA-OBL-${obligationId}-${crypto.randomUUID()}`.slice(0, 150)
);

const parseProviderData = (response) => response?.data || response || {};

const getHostedLink = (response) => {
  const body = parseProviderData(response);
  return body?.data?.link || body?.link || null;
};

const transitionTransaction = async (transaction, nextStatus, reason, db) => {
  if (!transaction || transaction.status === nextStatus) {
    return transaction;
  }

  if (!paymentProcessingService.isValidTransition(transaction.status, nextStatus)) {
    throw new AppError(
      `Invalid payment transaction transition: ${transaction.status} -> ${nextStatus}.`,
      409
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

const updateTransactionAfterProviderCall = async (transactionId, nextStatus, reason) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const transaction = await paymentTransactionRepository.findById(transactionId, connection, true);
    if (transaction && ['INITIATED', 'PENDING', 'UNKNOWN'].includes(transaction.status)) {
      await transitionTransaction(transaction, nextStatus, reason, connection);
    }
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};

const createCheckout = async ({ groupId, obligationId, userId }) => {
  if (!env.flutterwave.checkoutRedirectUrl) {
    throw new AppError('Flutterwave checkout redirect URL is not configured.', 503);
  }

  const connection = await pool.getConnection();
  let transaction;
  let membership;
  let obligation;
  let cycle;
  let identity;
  let customer;
  let transactionReference;

  try {
    await connection.beginTransaction();

    membership = await groupMembershipRepository.findByUserAndCooperative(
      userId,
      groupId,
      connection
    );
    if (!membership) {
      throw new AppError('Cooperative membership not found.', 404);
    }

    customer = await groupMembershipRepository.findByIdWithUser(membership.id, connection);
    obligation = await obligationRepository.findById(obligationId, connection, true);
    cycle = obligation
      ? await cycleRepository.findById(obligation.cycle_id, connection, true)
      : null;

    if (!obligation || !cycle || String(cycle.cooperative_id) !== String(groupId)) {
      throw new AppError('Contribution obligation not found in this Ajo.', 404);
    }
    if (String(obligation.membership_id) !== String(membership.id)) {
      throw new AppError('You can only pay your own contribution obligation.', 403);
    }
    if (cycle.status !== 'ACTIVE') {
      throw new AppError('Checkout is only available for an active cycle.', 409);
    }

    const outstandingMinor = toNonNegativeMinorUnits(obligation.amount_outstanding);
    if (outstandingMinor <= 0n || obligation.status === 'PAID') {
      throw new AppError('This contribution obligation has no outstanding balance.', 409);
    }

    identity = await paymentIdentityRepository.findByMembershipId(membership.id, connection, true);
    if (!identity || identity.status !== 'ACTIVE') {
      throw new AppError('Your Flutterwave payment identity is not ready yet.', 409);
    }
    if (String(identity.currency || 'NGN').toUpperCase() !== String(obligation.currency).toUpperCase()) {
      throw new AppError('Payment identity currency does not match the obligation currency.', 409);
    }

    transactionReference = buildTransactionReference(obligation.id);
    transaction = await paymentTransactionRepository.create({
      provider: PROVIDER,
      paymentIdentityId: identity.id,
      membershipId: membership.id,
      cooperativeId: groupId,
      obligationId: obligation.id,
      grossAmount: toDecimal(outstandingMinor),
      netAmount: toDecimal(outstandingMinor),
      currency: obligation.currency,
      status: 'INITIATED',
      allocationStatus: 'UNALLOCATED',
      transactionType: 'CONTRIBUTION',
      internalReference: transactionReference,
      metadata: {
        pamoja_payment_type: 'CONTRIBUTION',
        obligation_id: String(obligation.id),
        membership_id: String(membership.id),
        cycle_id: String(cycle.id),
        group_id: String(groupId),
        tx_ref: transactionReference
      }
    }, connection);

    await transactionStatusHistoryRepository.create({
      paymentTransactionId: transaction.id,
      previousStatus: null,
      newStatus: 'INITIATED',
      reason: 'Flutterwave checkout attempt created.'
    }, connection);

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }

  let providerResponse;
  try {
    providerResponse = await flutterwaveService.createCheckout({
      transactionReference,
      amount: Number(transaction.gross_amount),
      currency: transaction.currency,
      customer: {
        name: customer.name,
        email: customer.email
      },
      metadata: {
        pamoja_payment_type: 'CONTRIBUTION',
        obligation_id: String(obligation.id),
        membership_id: String(membership.id),
        cycle_id: String(cycle.id),
        group_id: String(groupId)
      }
    });
  } catch (error) {
    logFlutterwaveEvent('error', 'flutterwave.checkout.initialization_failed', {
      transactionId: transaction.id,
      obligationId: obligation.id,
      code: error.code || null,
      message: error.message
    });
    await updateTransactionAfterProviderCall(
      transaction.id,
      'FAILED',
      'Flutterwave checkout creation failed.'
    );
    throw new AppError(
      'We could not initialize your payment. Please try again.',
      502,
      null,
      'PAYMENT_INITIALIZATION_FAILED'
    );
  }

  const checkoutUrl = getHostedLink(providerResponse);
  if (!checkoutUrl || !/^https:\/\//i.test(checkoutUrl)) {
    await updateTransactionAfterProviderCall(
      transaction.id,
      'FAILED',
      'Flutterwave did not return a valid hosted checkout link.'
    );
    throw new AppError(
      'We could not initialize your payment. Please try again.',
      502,
      null,
      'PAYMENT_INITIALIZATION_FAILED'
    );
  }

  await updateTransactionAfterProviderCall(
    transaction.id,
    'PENDING',
    'Flutterwave hosted checkout created.'
  );

  return {
    checkoutUrl,
    transactionId: transaction.id,
    transactionReference,
    obligationId: obligation.id,
    amount: Number(transaction.gross_amount),
    currency: transaction.currency,
    status: 'PENDING'
  };
};

const markVerificationOutcome = async (transaction, status, reason) => {
  const nextStatus = ['failed', 'cancelled', 'canceled'].includes(status)
    ? 'FAILED'
    : 'RECONCILIATION_REQUIRED';
  await updateTransactionAfterProviderCall(transaction.id, nextStatus, reason);
  return nextStatus;
};

const handleCallback = async ({ status, transactionReference, transactionId }) => {
  if (!transactionReference) {
    throw new AppError('Flutterwave callback is missing tx_ref.', 422);
  }

  const transaction = await paymentTransactionRepository.findByInternalReference(transactionReference);
  if (!transaction || transaction.provider !== PROVIDER) {
    throw new AppError('Flutterwave checkout transaction was not found.', 404);
  }

  if (transaction.status === 'SUCCESS') {
    return { status: 'SUCCESS', transactionReference, transactionId: transaction.provider_transaction_id };
  }
  if (transaction.status === 'FAILED') {
    return { status: 'FAILED', transactionReference, transactionId: transaction.provider_transaction_id };
  }
  if (transaction.status === 'RECONCILIATION_REQUIRED') {
    return { status: 'RECONCILIATION_REQUIRED', transactionReference, transactionId: transaction.provider_transaction_id };
  }
  if (!transactionId) {
    return { status: 'REQUIRES_VERIFICATION', transactionReference, transactionId: null };
  }

  let verification;
  try {
    verification = await flutterwaveService.verifyTransaction(transactionId);
  } catch (error) {
    const nextStatus = await markVerificationOutcome(
      transaction,
      'unknown',
      'Flutterwave transaction verification was uncertain.'
    );
    return { status: nextStatus, transactionReference, transactionId };
  }

  const verified = parseProviderData(verification);
  const providerStatus = String(verified.status || '').toLowerCase();
  const verifiedReference = verified.tx_ref || verified.reference || null;
  let amountMatches = false;
  try {
    amountMatches = toNonNegativeMinorUnits(verified.amount || 0)
      === toNonNegativeMinorUnits(transaction.gross_amount);
  } catch (error) {
    amountMatches = false;
  }
  const currencyMatches = String(verified.currency || '').toUpperCase()
    === String(transaction.currency).toUpperCase();
  const transactionMatches = String(verified.id || '') === String(transactionId);
  const referenceMatches = String(verifiedReference || '') === String(transactionReference);

  if (!['success', 'successful'].includes(providerStatus)) {
    const nextStatus = await markVerificationOutcome(
      transaction,
      providerStatus,
      'Flutterwave reported a non-successful checkout result.'
    );
    return { status: nextStatus, transactionReference, transactionId };
  }

  if (!amountMatches || !currencyMatches || !transactionMatches || !referenceMatches) {
    const nextStatus = await markVerificationOutcome(
      transaction,
      'unknown',
      'Flutterwave checkout verification did not match the persisted attempt.'
    );
    return { status: nextStatus, transactionReference, transactionId };
  }

  const identity = await paymentIdentityRepository.findById(transaction.payment_identity_id);
  if (!identity) {
    const nextStatus = await markVerificationOutcome(
      transaction,
      'unknown',
      'Payment identity was unavailable during checkout verification.'
    );
    return { status: nextStatus, transactionReference, transactionId };
  }

  const result = await paymentProcessingService.processVerifiedPayment({
    storedEvent: null,
    event: {
      eventType: 'charge.completed',
      eventId: null,
      providerReference: verified.flw_ref || null,
      transactionReference,
      transactionId: String(transactionId),
      amount: verified.amount,
      currency: verified.currency,
      senderName: verified.customer?.name || null
    },
    identity,
    verification
  });

  return {
    status: result.reconciliationRequired || result.transaction?.status === 'RECONCILIATION_REQUIRED'
      ? 'RECONCILIATION_REQUIRED'
      : 'SUCCESS',
    transactionReference,
    transactionId,
    transaction: result.transaction ? { id: result.transaction.id } : null
  };
};

module.exports = {
  createCheckout,
  handleCallback,
  buildTransactionReference,
  getHostedLink
};
