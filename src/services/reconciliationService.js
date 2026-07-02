const transactionRepository = require('../repositories/transactionRepository');
const webhookLogRepository = require('../repositories/webhookLogRepository');

const SUCCESS_STATUSES = new Set(['success', 'successful', 'completed', 'paid']);

const toTransaction = (transaction) => ({
  id: transaction.id,
  tableKey: `transaction-${transaction.id}`,
  requestId: transaction.request_id,
  transactionId: transaction.transaction_id,
  memberId: transaction.member_id,
  memberName: transaction.member_name,
  accountRef: transaction.account_ref,
  cooperativeName: transaction.cooperative_name,
  amount: Number(transaction.amount),
  senderName: transaction.sender_name,
  narration: transaction.narration,
  eventType: transaction.event_type,
  status: transaction.status,
  createdAt: transaction.created_at
});

const toWebhookLog = (log) => ({
  id: log.id,
  tableKey: `webhook-${log.id}`,
  requestId: log.request_id,
  memberId: log.member_id,
  memberName: log.member_name,
  accountRef: log.account_ref,
  cooperativeName: log.cooperative_name,
  processed: Boolean(log.processed),
  payload: typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload,
  createdAt: log.created_at
});

const getReconciliation = async (ownerId) => {
  const [transactions, missingWebhookLogs, failedWebhookLogs] = await Promise.all([
    transactionRepository.findAllByOwnerId(ownerId),
    webhookLogRepository.findMissingByOwnerId(ownerId),
    webhookLogRepository.findFailedByOwnerId(ownerId)
  ]);

  const matchedTransactions = transactions.filter((transaction) =>
    SUCCESS_STATUSES.has(String(transaction.status).toLowerCase())
  );
  const failedTransactions = transactions.filter(
    (transaction) => !SUCCESS_STATUSES.has(String(transaction.status).toLowerCase())
  );

  const totalMatched = matchedTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

  return {
    summary: {
      matchedCount: matchedTransactions.length,
      missingCount: missingWebhookLogs.length,
      failedCount: failedTransactions.length + failedWebhookLogs.length,
      totalMatched
    },
    matched_transactions: matchedTransactions.map(toTransaction),
    missing_transactions: missingWebhookLogs.map(toWebhookLog),
    failed_transactions: [
      ...failedTransactions.map((transaction) => ({
        ...toTransaction(transaction),
        source: 'transaction'
      })),
      ...failedWebhookLogs.map((log) => ({
        ...toWebhookLog(log),
        source: 'webhook'
      }))
    ]
  };
};

module.exports = {
  getReconciliation
};
