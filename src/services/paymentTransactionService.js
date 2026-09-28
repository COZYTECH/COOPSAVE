const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const AppError = require('../utils/appError');

const toTransaction = (transaction) => ({
  id: transaction.id,
  provider: transaction.provider,
  providerTransactionId: transaction.provider_transaction_id,
  providerReference: transaction.provider_reference,
  paymentIdentityId: transaction.payment_identity_id,
  membershipId: transaction.membership_id,
  cooperativeId: transaction.cooperative_id,
  sourceWebhookEventId: transaction.source_webhook_event_id,
  grossAmount: Number(transaction.gross_amount),
  currency: transaction.currency,
  netAmount: Number(transaction.net_amount),
  status: transaction.status,
  allocationStatus: transaction.allocation_status,
  transactionType: transaction.transaction_type,
  internalReference: transaction.internal_reference,
  cycleName: transaction.cycle_name || null,
  obligationId: transaction.obligation_id || null,
  amountAllocated: transaction.amount_allocated === null || transaction.amount_allocated === undefined
    ? null
    : Number(transaction.amount_allocated),
  amountExcess: transaction.amount_excess === null || transaction.amount_excess === undefined
    ? null
    : Number(transaction.amount_excess),
  memberName: transaction.member_name || null,
  memberEmail: transaction.member_email || null,
  cooperativeName: transaction.cooperative_name || null,
  createdAt: transaction.created_at,
  updatedAt: transaction.updated_at
});

// Group and member views need contribution outcomes, not provider references
// or internal identifiers used by platform reconciliation.
const toScopedTransaction = (transaction) => ({
  id: transaction.id,
  membershipId: transaction.membership_id,
  cooperativeId: transaction.cooperative_id,
  grossAmount: Number(transaction.gross_amount),
  currency: transaction.currency,
  netAmount: Number(transaction.net_amount),
  status: transaction.status,
  allocationStatus: transaction.allocation_status,
  transactionType: transaction.transaction_type,
  cycleName: transaction.cycle_name || null,
  obligationId: transaction.obligation_id || null,
  amountAllocated: transaction.amount_allocated === null || transaction.amount_allocated === undefined
    ? null
    : Number(transaction.amount_allocated),
  amountExcess: transaction.amount_excess === null || transaction.amount_excess === undefined
    ? null
    : Number(transaction.amount_excess),
  memberName: transaction.member_name || null,
  memberEmail: transaction.member_email || null,
  cooperativeName: transaction.cooperative_name || null,
  createdAt: transaction.created_at,
  updatedAt: transaction.updated_at
});

const getForGroup = async (cooperativeId, userId) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(cooperativeId, userId);
  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }
  return (await paymentTransactionRepository.findAllByCooperativeId(cooperativeId)).map(toScopedTransaction);
};

const getForUserGroup = async (cooperativeId, userId) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) {
    throw new AppError('Cooperative membership not found.', 404);
  }
  return (await paymentTransactionRepository.findAllByMembershipId(membership.id)).map(toScopedTransaction);
};

const getForPlatform = async () => (await paymentTransactionRepository.findAll()).map(toTransaction);

module.exports = { getForGroup, getForUserGroup, getForPlatform, toTransaction };
