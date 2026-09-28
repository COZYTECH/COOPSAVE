const { pool } = require('../config/database');
const paymentIdentityRepository = require('../repositories/paymentIdentityRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const flutterwaveService = require('./flutterwave.service');
const AppError = require('../utils/appError');

const PROVIDER = 'FLUTTERWAVE';

const logPaymentIdentity = (event, metadata = {}) => {
  console.log(JSON.stringify({
    level: 'info',
    event,
    provider: PROVIDER.toLowerCase(),
    timestamp: new Date().toISOString(),
    ...metadata
  }));
};

const getProvisioningReference = (membershipId) => `PAMOJA-MEMBERSHIP-${membershipId}`;

const getErrorMessage = (error) => (
  error.response?.data?.message || error.response?.data?.error || error.message
);

const SAFE_PROVISIONING_ERROR = 'Payment account provisioning failed. Please try again.';

// Account numbers must never appear in structured logs. Keep only a short
// suffix so operators can correlate a provider event without exposing the
// recipient's full bank account number.
const redactAccountNumber = (accountNumber) => {
  if (accountNumber === undefined || accountNumber === null || accountNumber === '') {
    return null;
  }
  return `***${String(accountNumber).slice(-4)}`;
};

const normalizeProviderAccount = (response, fallbackReference = null) => {
  const body = response?.data || response;
  const data = body?.data || body;
  const account = data?.account || data?.virtual_account || data?.virtualAccount || data;

  return {
    // Flutterwave's v3 virtual-account response uses flw_ref/order_ref,
    // while older/provider-shaped responses may expose id/reference fields.
    providerReference: account?.flw_ref
      || account?.flw_reference
      || account?.id
      || account?.order_ref
      || null,
    // The request tx_ref is the stable merchant reference returned by the
    // Virtual Account webhook. It is distinct from Flutterwave's order_ref.
    transactionReference: account?.tx_ref || fallbackReference || null,
    virtualAccountReference: account?.account_reference
      || account?.accountReference
      || account?.reference
      || account?.tx_ref
      || account?.order_ref
      || fallbackReference
      || null,
    accountNumber: account?.account_number || account?.accountNumber || account?.account_no || null,
    accountName: account?.account_name || account?.accountName || account?.name || null,
    bankName: account?.bank_name || account?.bankName || account?.bank || null,
    currency: account?.currency || 'NGN',
    metadata: response
  };
};

const withMembership = async (membershipId) => {
  const membership = await groupMembershipRepository.findByIdWithUser(membershipId);
  if (!membership) {
    throw new AppError('Cooperative membership not found.', 404);
  }
  return membership;
};

const provisionForMembership = async ({ membershipId }) => {
  const membership = await withMembership(membershipId);
  const connection = await pool.getConnection();
  let identity;

  try {
    await connection.beginTransaction();

    identity = await paymentIdentityRepository.findByMembershipId(
      membershipId,
      connection,
      true
    );

    if (identity?.status === 'ACTIVE' || identity?.status === 'PROVISIONING') {
      await connection.commit();
      return identity;
    }

    if (identity) {
      identity = await paymentIdentityRepository.markProvisioning(identity.id, connection);
    } else {
      identity = await paymentIdentityRepository.createProvisioning(
        membershipId,
        { reference: getProvisioningReference(membershipId), mode: 'test' },
        connection
      );
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

  logPaymentIdentity('payment_identity.provisioning.started', {
    membershipId,
    paymentIdentityId: identity.id
  });

  try {
    const providerResponse = await flutterwaveService.createVirtualAccount({
      email: membership.email,
      name: membership.name,
      reference: getProvisioningReference(membershipId),
      currency: 'NGN'
    });

    const account = normalizeProviderAccount(
      providerResponse,
      getProvisioningReference(membershipId)
    );
    if (!account.accountNumber && !account.virtualAccountReference && !account.providerReference) {
      throw new Error('Flutterwave did not return a usable virtual account identity.');
    }

    const activeIdentity = await paymentIdentityRepository.markActive(identity.id, account);
    logPaymentIdentity('payment_identity.provisioning.succeeded', {
      membershipId,
      paymentIdentityId: identity.id,
      accountNumber: activeIdentity.account_number ? `***${String(activeIdentity.account_number).slice(-4)}` : null
    });
    return activeIdentity;
  } catch (error) {
    const internalMessage = getErrorMessage(error);
    const failedIdentity = await paymentIdentityRepository.markFailed(
      identity.id,
      SAFE_PROVISIONING_ERROR
    );
    logPaymentIdentity('payment_identity.provisioning.failed', {
      membershipId,
      paymentIdentityId: identity.id,
      errorCode: error.code || null,
      internalError: internalMessage
    });
    return failedIdentity;
  }
};

const provisionForUserMembership = async ({ userId, cooperativeId }) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) {
    throw new AppError('Cooperative membership not found.', 404);
  }
  return provisionForMembership({ membershipId: membership.id });
};

const getForUserMembership = async ({ userId, cooperativeId }) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) {
    throw new AppError('Cooperative membership not found.', 404);
  }
  return paymentIdentityRepository.findByMembershipId(membership.id);
};

const listForCooperative = async (cooperativeId) => (
  paymentIdentityRepository.findAllByCooperativeId(cooperativeId)
);

const listAll = async () => paymentIdentityRepository.findAll();

const resolveWebhookIdentity = async (references) => {
  const identity = await paymentIdentityRepository.findForWebhook(references);
  if (identity) {
    logPaymentIdentity('payment_identity.resolved', {
      paymentIdentityId: identity.id,
      membershipId: identity.cooperative_membership_id
    });
  } else {
    logPaymentIdentity('payment_identity.unknown_provider_payment', {
      providerReference: references.providerReference || null,
      virtualAccountReference: references.virtualAccountReference || null,
      accountNumber: redactAccountNumber(references.accountNumber)
    });
  }
  return identity;
};

module.exports = {
  provisionForMembership,
  provisionForUserMembership,
  getForUserMembership,
  listForCooperative,
  listAll,
  resolveWebhookIdentity,
  getProvisioningReference,
  redactAccountNumber,
  SAFE_PROVISIONING_ERROR
};
