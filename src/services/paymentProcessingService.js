const { pool } = require('../config/database');
const memberRepository = require('../repositories/memberRepository');
const transactionRepository = require('../repositories/transactionRepository');
const contributionRepository = require('../repositories/contributionRepository');
const AppError = require('../utils/appError');
const { emitPaymentReceived } = require('../config/socket');

const PAYMENT_SUCCESS_EVENT = 'payment_success';
const PAYMENT_STATUS_SUCCESS = 'success';

const toDecimalAmount = (amount) => {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new AppError('Payment amount is invalid.', 422);
  }

  return normalizedAmount.toFixed(2);
};

const logPaymentEvent = (event, metadata = {}) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event,
      timestamp: new Date().toISOString(),
      ...metadata
    })
  );
};

const buildPaymentReceivedPayload = ({ transaction, member, contribution }) => ({
  transaction: {
    id: transaction.id,
    requestId: transaction.request_id,
    transactionReference: transaction.transaction_id,
    memberId: transaction.member_id,
    amount: Number(transaction.amount),
    senderName: transaction.sender_name,
    narration: transaction.narration,
    eventType: transaction.event_type,
    status: transaction.status,
    createdAt: transaction.created_at
  },
  member: {
    id: member.id,
    fullName: member.full_name,
    accountRef: member.account_ref,
    cooperativeId: member.cooperative_id
  },
  contribution: contribution
    ? {
        id: contribution.id,
        memberId: contribution.member_id,
        totalAmount: Number(contribution.total_amount),
        lastTransactionId: contribution.last_transaction_id,
        updatedAt: contribution.updated_at
      }
    : null
});

const processSuccessfulPayment = async ({
  accountRef,
  amount,
  transactionReference,
  senderName = null,
  narration = null,
  eventId = null
}) => {
  if (!accountRef) {
    throw new AppError('Payment account reference is required.', 422);
  }

  if (!transactionReference) {
    throw new AppError('Payment transaction reference is required.', 422);
  }

  const decimalAmount = toDecimalAmount(amount);
  const member = await memberRepository.findByAccountRef(accountRef);

  if (!member) {
    throw new AppError('Member account reference was not found.', 404);
  }

  const existingTransaction =
    await transactionRepository.findByTransactionReference(transactionReference);

  if (existingTransaction) {
    logPaymentEvent('payment.processing.duplicate', {
      transactionReference,
      transactionId: existingTransaction.id,
      memberId: existingTransaction.member_id
    });

    return {
      processed: true,
      duplicate: true,
      transaction: existingTransaction,
      member
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const duplicateInTransaction =
      await transactionRepository.findByTransactionReference(
        transactionReference,
        connection
      );

    if (duplicateInTransaction) {
      await connection.commit();

      return {
        processed: true,
        duplicate: true,
        transaction: duplicateInTransaction,
        member
      };
    }

    const transaction = await transactionRepository.create(
      {
        requestId: eventId || transactionReference,
        transactionId: transactionReference,
        memberId: member.id,
        amount: decimalAmount,
        senderName,
        narration,
        eventType: PAYMENT_SUCCESS_EVENT,
        status: PAYMENT_STATUS_SUCCESS
      },
      connection
    );

    const contribution = await contributionRepository.addContribution(
      {
        memberId: member.id,
        amount: transaction.amount,
        transactionId: transaction.id
      },
      connection
    );

    await connection.commit();

    const payload = buildPaymentReceivedPayload({
      transaction,
      member,
      contribution
    });

    emitPaymentReceived(member.owner_id, payload);
    logPaymentEvent('payment.processing.completed', {
      transactionId: transaction.id,
      transactionReference,
      memberId: member.id,
      contributionId: contribution ? contribution.id : null
    });

    return {
      processed: true,
      duplicate: false,
      transaction,
      member,
      contribution
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      const duplicateTransaction =
        await transactionRepository.findByTransactionReference(
          transactionReference
        );

      if (duplicateTransaction) {
        logPaymentEvent('payment.processing.duplicate_race', {
          transactionReference,
          transactionId: duplicateTransaction.id
        });

        return {
          processed: true,
          duplicate: true,
          transaction: duplicateTransaction,
          member
        };
      }
    }

    logPaymentEvent('payment.processing.failed', {
      transactionReference,
      memberId: member.id,
      error: error.message
    });
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  processSuccessfulPayment
};
