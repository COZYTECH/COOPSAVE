const webhookEventRepository = require('../repositories/webhookEventRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const paymentIdentityRepository = require('../repositories/paymentIdentityRepository');
const paymentIdentityService = require('./paymentIdentityService');
const flutterwaveService = require('./flutterwave.service');
const paymentProcessingService = require('./paymentProcessingService');
const payoutService = require('./payoutService');
const AppError = require('../utils/appError');

const PROVIDER = 'FLUTTERWAVE';

const logWebhook = (event, metadata = {}) => {
  console.log(JSON.stringify({
    level: 'info',
    event,
    provider: PROVIDER.toLowerCase(),
    timestamp: new Date().toISOString(),
    ...metadata
  }));
};

const toRawString = (rawPayload) => {
  if (Buffer.isBuffer(rawPayload)) {
    return rawPayload.toString('utf8');
  }
  if (typeof rawPayload === 'string') {
    return rawPayload;
  }
  return JSON.stringify(rawPayload);
};

const parsePayload = (rawPayload) => {
  try {
    return JSON.parse(toRawString(rawPayload));
  } catch (error) {
    throw new AppError('Flutterwave webhook payload must be valid JSON.', 400);
  }
};

const valueAt = (payload, paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], payload);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
};

const nullableString = (value) => (
  value === undefined || value === null || value === '' ? null : String(value).trim()
);

const extractEvent = (payload) => ({
  eventType: String(valueAt(payload, ['event', 'event_type', 'eventType', 'type']) || '')
    .trim()
    .toLowerCase(),
  eventId: nullableString(valueAt(payload, ['id', 'event_id', 'eventId', 'data.event_id'])),
  providerReference: nullableString(valueAt(payload, [
    'data.flw_ref',
    'data.flw_reference',
    'data.provider_reference',
    'data.reference'
  ])),
  transactionReference: nullableString(valueAt(payload, [
    'data.tx_ref',
    'data.transaction_reference',
    'data.transactionReference',
    'data.reference',
    'tx_ref',
    'reference'
  ])),
  virtualAccountReference: nullableString(valueAt(payload, [
    'data.account_ref',
    'data.account_reference',
    'data.virtual_account_reference',
    'data.virtualAccountReference',
    'data.order_ref'
  ])),
  accountNumber: nullableString(valueAt(payload, [
    'data.account_number',
    'data.accountNumber',
    'data.virtual_account_number',
    'data.virtualAccountNumber'
  ])),
  amount: valueAt(payload, ['data.amount', 'amount']),
  currency: nullableString(valueAt(payload, ['data.currency', 'currency'])),
  transactionId: nullableString(valueAt(payload, ['data.id', 'data.transaction_id'])),
  senderName: nullableString(valueAt(payload, [
    'meta_data.originatorname',
    'data.meta_data.originatorname',
    'data.customer.name',
    'data.sender_name',
    'data.senderName'
  ])),
  senderAccountNumber: nullableString(valueAt(payload, [
    'meta_data.originatoraccountnumber',
    'data.meta_data.originatoraccountnumber'
  ])),
  senderBankName: nullableString(valueAt(payload, [
    'meta_data.bankname',
    'data.meta_data.bankname'
  ])),
  senderAmount: valueAt(payload, [
    'meta_data.originatoramount',
    'data.meta_data.originatoramount'
  ]),
  narration: nullableString(valueAt(payload, ['data.narration', 'data.meta.narration'])),
  transferId: nullableString(valueAt(payload, ['data.id', 'data.transfer_id', 'data.transferId'])),
  transferReference: nullableString(valueAt(payload, ['data.reference', 'data.transfer_reference', 'data.transferReference'])),
  transferStatus: nullableString(valueAt(payload, ['data.status', 'status'])),
  transferAmount: valueAt(payload, ['data.amount']),
  transferCurrency: nullableString(valueAt(payload, ['data.currency'])),
  recipientBankCode: nullableString(valueAt(payload, ['data.account_bank', 'data.bank_code', 'data.bank.code'])),
  transferData: valueAt(payload, ['data'])
});

// Webhook persistence retains the raw payload for internal processing and
// audit, but the public acknowledgement must never echo it to the provider.
const toPublicEvent = (event) => event && ({
  id: event.id,
  provider: event.provider,
  eventType: event.event_type,
  eventId: event.event_id,
  transactionReference: event.transaction_reference,
  processingStatus: event.processing_status,
  receivedAt: event.received_at
});

const validateEvent = (payload, event) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Flutterwave webhook payload must be a JSON object.', 400);
  }
  if (!event.eventType) {
    throw new AppError('Flutterwave webhook event is required.', 422);
  }
  if (!event.eventId && !event.transactionReference && !event.providerReference) {
    throw new AppError('Flutterwave webhook reference is required.', 422);
  }
};

const getSignature = (headers) => (
  headers['verif-hash'] || headers['verif_hash'] || headers['flutterwave-signature'] || ''
);

const verifyAndProcessPersistedEvent = async (storedEvent, event) => {
  if (event.eventType.startsWith('transfer.')) {
    try {
      const result = await payoutService.processTransferWebhook({ storedEvent, event });
      await webhookEventRepository.updateProcessingStatus(
        storedEvent.id,
        result.reconciliationRequired ? 'RECONCILIATION_REQUIRED' : 'PROCESSED'
      );
      logWebhook('flutterwave.transfer_webhook.processed', {
        webhookEventId: storedEvent.id,
        reconciliationRequired: Boolean(result.reconciliationRequired),
        duplicate: Boolean(result.duplicate)
      });
    } catch (error) {
      logWebhook('flutterwave.transfer_webhook.processing_failed', {
        webhookEventId: storedEvent.id,
        message: error.message
      });
      await webhookEventRepository.updateProcessingStatus(storedEvent.id, 'RECONCILIATION_REQUIRED');
    }
    return;
  }

  if (!new Set(['charge.completed', 'charge_completed', 'payment.completed']).has(event.eventType)) {
    await webhookEventRepository.updateProcessingStatus(storedEvent.id, 'PROCESSED');
    return;
  }

  let identity;
  if (String(event.transactionReference || '').startsWith('PAMOJA-OBL-')) {
    // Standard Checkout has no virtual-account identifier. Its server-created
    // tx_ref resolves the payment attempt, which carries the Ajo membership.
    const checkoutTransaction = await paymentTransactionRepository.findByInternalReference(
      event.transactionReference
    );
    identity = checkoutTransaction
      ? await paymentIdentityRepository.findById(checkoutTransaction.payment_identity_id)
      : null;
  } else {
    identity = await paymentIdentityService.resolveWebhookIdentity({
      providerReference: event.providerReference,
      transactionReference: event.transactionReference,
      virtualAccountReference: event.virtualAccountReference,
      accountNumber: event.accountNumber
    });
  }

  if (!identity) {
    await webhookEventRepository.updateProcessingStatus(
      storedEvent.id,
      'RECONCILIATION_REQUIRED'
    );
    return;
  }

  if (!event.transactionId) {
    await webhookEventRepository.updateProcessingStatus(storedEvent.id, 'IDENTITY_RESOLVED');
    return;
  }

  try {
    const verification = await flutterwaveService.verifyTransaction(event.transactionId);
    const verifiedData = verification?.data || {};
    const verifiedStatus = String(verifiedData.status || '').toLowerCase();
    const amountMatches = event.amount === null
      || event.amount === undefined
      || Number(verifiedData.amount) === Number(event.amount);
    const currencyMatches = !event.currency
      || String(verifiedData.currency || '').toUpperCase() === event.currency.toUpperCase();
    const verifiedReference = verifiedData.tx_ref || verifiedData.reference || null;
    const referenceMatches = !event.transactionReference
      || !verifiedReference
      || String(verifiedReference) === String(event.transactionReference);
    const providerReferenceMatches = !event.transactionId
      || !verifiedData.id
      || String(verifiedData.id) === String(event.transactionId);

    const providerFailed = !['success', 'successful'].includes(verifiedStatus);
    const integrityMismatch = !amountMatches
      || !currencyMatches
      || !referenceMatches
      || !providerReferenceMatches;

    if (providerFailed || integrityMismatch) {
      // A provider-declared failure is terminal. A successful-looking event
      // whose amount, currency, or reference cannot be proven is retained for
      // reconciliation rather than being treated as a normal failed payment.
      await webhookEventRepository.updateProcessingStatus(
        storedEvent.id,
        providerFailed ? 'FAILED' : 'RECONCILIATION_REQUIRED'
      );
      return;
    }

    const result = await paymentProcessingService.processVerifiedPayment({
      storedEvent,
      event,
      identity,
      verification
    });
    await webhookEventRepository.updateProcessingStatus(
      storedEvent.id,
      result.reconciliationRequired ? 'RECONCILIATION_REQUIRED' : 'PROCESSED'
    );
    logWebhook('flutterwave.webhook.processed', {
      webhookEventId: storedEvent.id,
      transactionId: result.transaction?.id || null,
      reconciliationRequired: Boolean(result.reconciliationRequired)
    });
  } catch (error) {
    logWebhook('flutterwave.webhook.verification_failed', {
      webhookEventId: storedEvent.id,
      message: error.message
    });
    await webhookEventRepository.updateProcessingStatus(
      storedEvent.id,
      error.statusCode === 400 || error.statusCode === 422 || error.statusCode === 404
        ? 'RECONCILIATION_REQUIRED'
        : 'FAILED'
    );
  }
};

const ingest = async ({ rawPayload, signature }) => {
  logWebhook('flutterwave.webhook.received', { signaturePresent: Boolean(signature) });

  if (!flutterwaveService.verifyWebhookSignature(signature)) {
    logWebhook('flutterwave.webhook.rejected', { reason: 'invalid_signature' });
    throw new AppError('Invalid Flutterwave webhook signature.', 401);
  }

  const payload = parsePayload(rawPayload);
  const event = extractEvent(payload);
  validateEvent(payload, event);
  const duplicateReference = event.transactionReference || event.providerReference;

  const duplicate = await webhookEventRepository.findDuplicate({
    provider: PROVIDER,
    eventId: event.eventId,
    transactionReference: duplicateReference
  });

  if (duplicate) {
    logWebhook('flutterwave.webhook.duplicate', { webhookEventId: duplicate.id });
    return { duplicate: true, event: toPublicEvent(duplicate) };
  }

  let storedEvent;
  try {
    storedEvent = await webhookEventRepository.create({
      provider: PROVIDER,
      eventType: event.eventType,
      eventId: event.eventId,
      accountRef: event.virtualAccountReference || event.accountNumber,
      transactionReference: duplicateReference,
      processingStatus: 'PENDING',
      rawPayload: toRawString(rawPayload)
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const raceDuplicate = await webhookEventRepository.findDuplicate({
        provider: PROVIDER,
        eventId: event.eventId,
        transactionReference: duplicateReference
      });
      if (raceDuplicate) {
        return { duplicate: true, event: toPublicEvent(raceDuplicate) };
      }
    }
    throw error;
  }

  // Acknowledge after the raw event is durable. Resolution and provider
  // verification continue outside the request path so retries cannot create
  // duplicate work and Nomba-style long webhook waits are avoided.
  setImmediate(() => {
    verifyAndProcessPersistedEvent(storedEvent, event).catch((error) => {
      logWebhook('flutterwave.webhook.processing_failed', {
        webhookEventId: storedEvent.id,
        message: error.message
      });
      webhookEventRepository.updateProcessingStatus(storedEvent.id, 'RECONCILIATION_REQUIRED').catch(() => {});
    });
  });

  return { duplicate: false, event: toPublicEvent(storedEvent) };
};

module.exports = {
  ingest,
  getSignature,
  parsePayload,
  extractEvent,
  validateEvent,
  verifyAndProcessPersistedEvent
};
