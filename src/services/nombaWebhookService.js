const env = require('../config/env');
const { pool } = require('../config/database');
const memberRepository = require('../repositories/memberRepository');
const transactionRepository = require('../repositories/transactionRepository');
const webhookLogRepository = require('../repositories/webhookLogRepository');
const contributionRepository = require('../repositories/contributionRepository');
const nombaService = require('./nomba.service');
const AppError = require('../utils/appError');
const { emitPaymentReceived } = require('../config/socket');

const PAYMENT_SUCCESS_EVENT = 'payment_success';

const parsePayload = (rawPayload) => {
  try {
    if (Buffer.isBuffer(rawPayload)) {
      return JSON.parse(rawPayload.toString('utf8'));
    }

    if (typeof rawPayload === 'string') {
      return JSON.parse(rawPayload);
    }

    return rawPayload;
  } catch (error) {
    throw new AppError('Webhook payload must be valid JSON.', 400);
  }
};

const getValue = (payload, paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }

      return current[key];
    }, payload);

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
};

const normalizeEventType = (eventType) => {
  return String(eventType || '')
    .trim()
    .toLowerCase()
    .replace(/[.\-\s]+/g, '_');
};

const toDecimalAmount = (amount) => {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new AppError('Webhook payment amount is invalid.', 422);
  }

  return normalizedAmount.toFixed(2);
};

const extractWebhookData = (payload) => {
  const requestId = extractRequestId(payload);

  const eventType = normalizeEventType(
    getValue(payload, [
      'event_type',
      'eventType',
      'event',
      'type',
      'data.event_type',
      'data.eventType',
      'data.event',
      'data.type'
    ])
  );

  const transactionId = getValue(payload, [
    'transaction_id',
    'transactionId',
    'data.transaction_id',
    'data.transactionId',
    'data.id'
  ]);

  const accountRef = getValue(payload, [
    'account_ref',
    'accountRef',
    'account_reference',
    'accountReference',
    'data.account_ref',
    'data.accountRef',
    'data.account_reference',
    'data.accountReference',
    'data.virtual_account.account_ref',
    'data.virtual_account.accountRef',
    'data.virtual_account.reference',
    'data.virtualAccount.account_ref',
    'data.virtualAccount.accountRef',
    'data.virtualAccount.reference'
  ]);

  const amount = getValue(payload, [
    'amount',
    'data.amount',
    'data.amount.value',
    'data.transaction.amount'
  ]);

  const senderName = getValue(payload, [
    'sender_name',
    'senderName',
    'data.sender_name',
    'data.senderName',
    'data.sender.name',
    'data.customer.name'
  ]);

  const narration = getValue(payload, [
    'narration',
    'description',
    'data.narration',
    'data.description',
    'data.transaction.narration'
  ]);

  const status = getValue(payload, [
    'status',
    'data.status',
    'data.transaction.status'
  ]);

  if (!requestId) {
    throw new AppError('Webhook request_id is required.', 422);
  }

  return {
    requestId: String(requestId),
    eventType,
    transactionId: transactionId ? String(transactionId) : null,
    accountRef: accountRef ? String(accountRef) : null,
    amount,
    senderName: senderName ? String(senderName) : null,
    narration: narration ? String(narration) : null,
    status: status ? String(status) : 'success'
  };
};

const extractRequestId = (payload) => {
  return getValue(payload, [
    'request_id',
    'requestId',
    'event_id',
    'eventId',
    'data.request_id',
    'data.requestId',
    'data.event_id',
    'data.eventId'
  ]);
};

const processPaymentSuccess = async ({ webhookData, db }) => {
  if (!webhookData.accountRef) {
    throw new AppError('Webhook account reference is required.', 422);
  }

  const member = await memberRepository.findByAccountRef(webhookData.accountRef, db);

  if (!member) {
    throw new AppError('Member account reference was not found.', 404);
  }

  const transaction = await transactionRepository.create(
    {
      requestId: webhookData.requestId,
      transactionId: webhookData.transactionId,
      memberId: member.id,
      amount: toDecimalAmount(webhookData.amount),
      senderName: webhookData.senderName,
      narration: webhookData.narration,
      eventType: webhookData.eventType,
      status: webhookData.status
    },
    db
  );

  await contributionRepository.addContribution(
    {
      memberId: member.id,
      amount: transaction.amount,
      transactionId: transaction.id
    },
    db
  );

  return {
    transaction,
    member
  };
};

const processNombaWebhook = async ({ rawPayload, signature }) => {
  const payload = parsePayload(rawPayload);
  const webhookLog = await webhookLogRepository.create({
    requestId: extractRequestId(payload),
    payload
  });

  const isValidSignature = nombaService.verifyWebhookSignature(
    rawPayload,
    signature
  );

  if (!isValidSignature) {
    throw new AppError('Invalid Nomba webhook signature.', 401);
  }

  const webhookData = extractWebhookData(payload);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingTransaction = await transactionRepository.findByRequestId(
      webhookData.requestId,
      connection
    );

    if (existingTransaction) {
      await webhookLogRepository.markProcessed(webhookLog.id, connection);
      await connection.commit();

      return {
        processed: true,
        duplicate: true,
        transaction: existingTransaction
      };
    }

    let paymentResult = null;

    if (webhookData.eventType === PAYMENT_SUCCESS_EVENT) {
      paymentResult = await processPaymentSuccess({ webhookData, db: connection });
    }

    await webhookLogRepository.markProcessed(webhookLog.id, connection);
    await connection.commit();

    if (paymentResult) {
      emitPaymentReceived(paymentResult.member.owner_id, {
        transaction: {
          id: paymentResult.transaction.id,
          requestId: paymentResult.transaction.request_id,
          transactionId: paymentResult.transaction.transaction_id,
          memberId: paymentResult.transaction.member_id,
          amount: Number(paymentResult.transaction.amount),
          senderName: paymentResult.transaction.sender_name,
          narration: paymentResult.transaction.narration,
          eventType: paymentResult.transaction.event_type,
          status: paymentResult.transaction.status,
          createdAt: paymentResult.transaction.created_at
        },
        member: {
          id: paymentResult.member.id,
          fullName: paymentResult.member.full_name,
          accountRef: paymentResult.member.account_ref,
          cooperativeId: paymentResult.member.cooperative_id
        }
      });
    }

    return {
      processed: true,
      duplicate: false,
      ignored: webhookData.eventType !== PAYMENT_SUCCESS_EVENT,
      eventType: webhookData.eventType,
      transaction: paymentResult ? paymentResult.transaction : null
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      await webhookLogRepository.markProcessed(webhookLog.id);

      return {
        processed: true,
        duplicate: true
      };
    }

    throw error;
  } finally {
    connection.release();
  }
};

const getNombaSignature = (headers) => {
  return (
    headers[env.nomba.webhookSignatureHeader] ||
    headers['nomba-signature'] ||
    headers['x-nomba-signature'] ||
    ''
  );
};

module.exports = {
  processNombaWebhook,
  getNombaSignature
};
