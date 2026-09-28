const financialAccountRepository = require('../repositories/financialAccountRepository');
const paymentIdentityRepository = require('../repositories/paymentIdentityRepository');
const cycleRepository = require('../repositories/cycleRepository');
const obligationRepository = require('../repositories/obligationRepository');
const paymentTransactionService = require('./paymentTransactionService');
const payoutService = require('./payoutService');
const AppError = require('../utils/appError');

const ACCOUNT_STATUSES = new Set(['ACTIVE', 'PROVISIONING', 'FAILED', 'SUSPENDED']);

const clampPageSize = (value) => Math.min(Math.max(Number(value) || 25, 1), 100);
const clampPage = (value) => Math.max(Number(value) || 1, 1);

const maskProviderValue = (value) => {
  if (!value) return null;
  return `********${String(value).slice(-4)}`;
};

const toNumber = (value) => Number(value || 0);

const toAccount = (account) => ({
  id: account.cooperative_id,
  cooperativeId: account.cooperative_id,
  cooperativeName: account.cooperative_name,
  cooperativeDescription: account.cooperative_description,
  provider: account.provider,
  providerIdentityType: account.provider_identity_type,
  providerIdentity: account.provider_identity,
  providerIdentityCount: Number(account.provider_identity_count || 0),
  activeIdentityCount: Number(account.active_identity_count || 0),
  status: account.account_status,
  totalContributions: toNumber(account.total_contributions),
  totalPaidOut: toNumber(account.total_paid_out),
  reservedPayouts: toNumber(account.reserved_payouts),
  availableForPayout: toNumber(account.available_for_payout),
  outstandingContributions: toNumber(account.outstanding_contributions),
  successfulPaymentCount: Number(account.successful_payment_count || 0),
  pendingPaymentCount: Number(account.pending_payment_count || 0),
  failedPaymentCount: Number(account.failed_payment_count || 0),
  unresolvedPaymentCount: Number(account.unresolved_payment_count || 0),
  unresolvedPayoutCount: Number(account.unresolved_payout_count || 0),
  createdAt: account.cooperative_created_at,
  updatedAt: account.identity_updated_at || account.cooperative_created_at
});

const toProviderIdentity = (identity) => ({
  id: identity.id,
  cooperativeMembershipId: identity.cooperative_membership_id,
  memberName: identity.member_name,
  memberEmail: identity.member_email,
  provider: identity.provider,
  providerIdentityType: identity.provider_identity_type,
  providerReference: maskProviderValue(identity.provider_reference),
  virtualAccountReference: maskProviderValue(identity.virtual_account_reference),
  accountNumber: maskProviderValue(identity.account_number),
  accountName: identity.account_name,
  bankName: identity.bank_name,
  currency: identity.currency,
  status: identity.status,
  createdAt: identity.created_at,
  updatedAt: identity.updated_at
});

const toPaymentActivity = (transaction) => ({
  id: transaction.id,
  date: transaction.created_at,
  memberName: transaction.member_name,
  amount: toNumber(transaction.gross_amount),
  currency: transaction.currency,
  provider: transaction.provider,
  providerReference: maskProviderValue(transaction.provider_reference || transaction.provider_transaction_id),
  paymentStatus: transaction.status,
  allocationStatus: transaction.allocation_status,
  obligation: transaction.obligation_id ? `Obligation #${transaction.obligation_id}` : null,
  cycleName: transaction.cycle_name || null,
  transactionId: transaction.id
});

const toPayoutActivity = (payout) => {
  const normalized = payoutService.toPayout(payout);
  return {
    id: normalized.id,
    date: normalized.createdAt,
    recipientName: normalized.recipientName,
    amount: normalized.amount,
    currency: normalized.currency,
    status: normalized.status,
    provider: normalized.provider,
    providerReference: maskProviderValue(normalized.providerReference || normalized.providerTransferId),
    payoutId: normalized.id,
    cycleName: normalized.cycleName
  };
};

const toLedgerEntry = (entry) => ({
  id: entry.id,
  date: entry.created_at,
  type: entry.entry_type,
  description: entry.description,
  amount: toNumber(entry.amount),
  currency: entry.currency,
  direction: entry.direction,
  reference: maskProviderValue(entry.reference),
  transactionId: entry.payment_transaction_id,
  payoutId: entry.payout_id
});

const toCycle = (cycle, obligations) => {
  const cycleObligations = obligations.filter((item) => String(item.cycle_id) === String(cycle.id));
  const expected = cycleObligations.reduce((sum, item) => sum + toNumber(item.expected_amount), 0);
  const collected = cycleObligations.reduce((sum, item) => sum + toNumber(item.amount_paid), 0);
  const outstanding = cycleObligations.reduce((sum, item) => sum + toNumber(item.amount_outstanding), 0);

  return {
    id: cycle.id,
    cycleNumber: cycle.cycle_number,
    name: cycle.name,
    contributionAmount: toNumber(cycle.contribution_amount),
    currency: cycle.currency,
    frequency: cycle.frequency,
    startDate: cycle.start_date,
    endDate: cycle.end_date,
    status: cycle.status,
    members: cycleObligations.length,
    expectedAmount: expected,
    collectedAmount: collected,
    outstandingAmount: outstanding,
    progress: expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0
  };
};

const getList = async ({ search = '', status = '', provider = '', page = 1, pageSize = 25 } = {}) => {
  const normalizedStatus = String(status || '').toUpperCase();
  if (normalizedStatus && !ACCOUNT_STATUSES.has(normalizedStatus)) {
    throw new AppError('Unsupported financial account status.', 422);
  }

  const size = clampPageSize(pageSize);
  const currentPage = clampPage(page);
  const offset = (currentPage - 1) * size;
  const [accounts, summary] = await Promise.all([
    financialAccountRepository.findAccounts({ search: String(search || '').trim(), status: normalizedStatus, provider: String(provider || '').trim(), limit: size, offset }),
    financialAccountRepository.getSummary()
  ]);

  return {
    summary: {
      totalAccounts: Number(summary.total_accounts || 0),
      activeAccounts: Number(summary.active_accounts || 0),
      totalContributions: toNumber(summary.total_contributions),
      availableForPayout: toNumber(summary.available_for_payout)
    },
    accounts: accounts.rows.map(toAccount),
    pagination: {
      page: currentPage,
      pageSize: size,
      total: accounts.total,
      totalPages: Math.ceil(accounts.total / size)
    }
  };
};

const getDetails = async (cooperativeId, { page = 1, pageSize = 25, cycleId = null } = {}) => {
  const account = await financialAccountRepository.findAccountByCooperativeId(cooperativeId);
  if (!account) {
    throw new AppError('Cooperative financial account not found.', 404);
  }

  const size = clampPageSize(pageSize);
  const currentPage = clampPage(page);
  const offset = (currentPage - 1) * size;
  const [identities, cycles, obligations, transactions, payouts, ledgerEntries] = await Promise.all([
    paymentIdentityRepository.findAllByCooperativeId(cooperativeId),
    cycleRepository.findAllByCooperativeId(cooperativeId),
    obligationRepository.findAllByCooperativeId(cooperativeId),
    financialAccountRepository.findPaymentsByCooperativeId(cooperativeId, size, offset, undefined, cycleId),
    financialAccountRepository.findPayoutsByCooperativeId(cooperativeId, size, offset, undefined, cycleId),
    financialAccountRepository.findLedgerEntriesByCooperativeId(cooperativeId, size, offset, undefined, cycleId)
  ]);

  const selectedCycle = cycleId ? cycles.find((cycle) => String(cycle.id) === String(cycleId)) : null;
  if (cycleId && !selectedCycle) {
    throw new AppError('Cycle not found for this cooperative.', 404);
  }
  const scopedObligations = cycleId
    ? obligations.filter((obligation) => String(obligation.cycle_id) === String(cycleId))
    : obligations;

  const activeCycle = selectedCycle || cycles.find((cycle) => cycle.status === 'ACTIVE');
  const financialAccount = toAccount(account);
  const selectedOverview = activeCycle ? toCycle(activeCycle, scopedObligations) : null;
  const scopedConfirmedPayouts = payouts
    .filter((payout) => payout.status === 'SUCCESS')
    .reduce((sum, payout) => sum + toNumber(payout.amount), 0);
  const scopedSummary = cycleId && selectedOverview
    ? {
      totalConfirmedContributions: selectedOverview.collectedAmount,
      totalConfirmedPayouts: scopedConfirmedPayouts,
      availableFinancialPosition: Math.max(0, selectedOverview.collectedAmount - scopedConfirmedPayouts),
      outstandingContributions: selectedOverview.outstandingAmount,
      successfulPayments: transactions.filter((transaction) => transaction.status === 'SUCCESS').length,
      pendingPayments: transactions.filter((transaction) => transaction.status === 'PENDING').length,
      failedPayments: transactions.filter((transaction) => transaction.status === 'FAILED').length
    }
    : {
      totalConfirmedContributions: financialAccount.totalContributions,
      totalConfirmedPayouts: financialAccount.totalPaidOut,
      availableFinancialPosition: financialAccount.availableForPayout,
      outstandingContributions: financialAccount.outstandingContributions,
      successfulPayments: financialAccount.successfulPaymentCount,
      pendingPayments: financialAccount.pendingPaymentCount,
      failedPayments: financialAccount.failedPaymentCount
    };

  return {
    account: financialAccount,
    providerIdentities: identities.map(toProviderIdentity),
    summary: scopedSummary,
    currentCycle: activeCycle ? toCycle(activeCycle, scopedObligations) : null,
    cycles: cycles.map((cycle) => toCycle(cycle, obligations)),
    selectedCycleId: cycleId ? Number(cycleId) : null,
    payments: transactions.map(toPaymentActivity),
    payouts: payouts.map(toPayoutActivity),
    ledger: ledgerEntries.map(toLedgerEntry),
    reconciliation: {
      unresolvedPaymentTransactions: financialAccount.unresolvedPaymentCount,
      unresolvedPayouts: financialAccount.unresolvedPayoutCount,
      unresolvedCount: financialAccount.unresolvedPaymentCount + financialAccount.unresolvedPayoutCount,
      required: financialAccount.unresolvedPaymentCount + financialAccount.unresolvedPayoutCount > 0
    },
    pagination: {
      page: currentPage,
      pageSize: size
    }
  };
};

module.exports = {
  getList,
  getDetails,
  maskProviderValue,
  toAccount
};
