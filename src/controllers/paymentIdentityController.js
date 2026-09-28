const paymentIdentityService = require('../services/paymentIdentityService');
const { SAFE_PROVISIONING_ERROR } = paymentIdentityService;
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const toPaymentIdentity = (identity) => {
  if (!identity) {
    return null;
  }

  return {
    id: identity.id,
    cooperativeMembershipId: identity.cooperative_membership_id,
    provider: identity.provider,
    providerIdentityType: identity.provider_identity_type,
    providerReference: identity.provider_reference,
    virtualAccountReference: identity.virtual_account_reference,
    transactionReference: identity.transaction_reference,
    accountNumber: identity.account_number,
    accountName: identity.account_name,
    bankName: identity.bank_name,
    currency: identity.currency,
    status: identity.status,
    provisioningError: identity.status === 'FAILED'
      ? SAFE_PROVISIONING_ERROR
      : null,
    createdAt: identity.created_at,
    updatedAt: identity.updated_at,
    memberName: identity.member_name,
    memberEmail: identity.member_email,
    userId: identity.user_id,
    cooperativeId: identity.cooperative_id,
    cooperativeName: identity.cooperative_name
  };
};

const toGroupPaymentIdentity = (identity) => {
  if (!identity) {
    return null;
  }

  return {
    id: identity.id,
    cooperativeMembershipId: identity.cooperative_membership_id,
    status: identity.status === 'ACTIVE'
      ? 'ACTIVE'
      : identity.status === 'FAILED' ? 'FAILED' : 'PROVISIONING',
    createdAt: identity.created_at,
    updatedAt: identity.updated_at,
    memberName: identity.member_name,
    memberEmail: identity.member_email,
    userId: identity.user_id,
    cooperativeId: identity.cooperative_id,
    cooperativeName: identity.cooperative_name
  };
};

const getMyPaymentIdentity = asyncHandler(async (req, res) => {
  const identity = await paymentIdentityService.getForUserMembership({
    userId: req.user.id,
    cooperativeId: req.params.groupId
  });

  return apiResponse.success(res, 200, 'Payment identity retrieved.', {
    paymentIdentity: toPaymentIdentity(identity)
  });
});

const provisionMyPaymentIdentity = asyncHandler(async (req, res) => {
  const identity = await paymentIdentityService.provisionForUserMembership({
    userId: req.user.id,
    cooperativeId: req.params.groupId
  });

  return apiResponse.success(res, 200, 'Payment identity provisioning completed.', {
    paymentIdentity: toPaymentIdentity(identity)
  });
});

const listPaymentIdentities = asyncHandler(async (req, res) => {
  const identities = await paymentIdentityService.listForCooperative(req.params.groupId);
  return apiResponse.success(res, 200, 'Group payment identities retrieved.', {
    paymentIdentities: identities.map(toGroupPaymentIdentity)
  });
});

const listAllPaymentIdentities = asyncHandler(async (req, res) => {
  const identities = await paymentIdentityService.listAll();
  return apiResponse.success(res, 200, 'Platform payment identities retrieved.', {
    paymentIdentities: identities.map(toPaymentIdentity)
  });
});

module.exports = {
  getMyPaymentIdentity,
  provisionMyPaymentIdentity,
  listPaymentIdentities,
  listAllPaymentIdentities
};
