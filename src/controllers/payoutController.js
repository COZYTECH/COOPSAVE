const payoutService = require('../services/payoutService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const createPayout = asyncHandler(async (req, res) => {
  const payout = await payoutService.createPayout(
    req.params.groupId,
    req.params.cycleId,
    req.user.id
  );
  return apiResponse.success(res, 201, 'Payout initiated.', {
    payout: payoutService.toScopedPayout(payout)
  });
});

const retryPayout = asyncHandler(async (req, res) => {
  const payout = await payoutService.retryPayout(
    req.params.groupId,
    req.params.payoutId,
    req.user.id
  );
  return apiResponse.success(res, 200, 'Payout retry initiated.', {
    payout: payoutService.toScopedPayout(payout)
  });
});

const listGroupPayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutService.getForGroup(req.params.groupId, req.user.id);
  return apiResponse.success(res, 200, 'Group payouts retrieved.', { payouts });
});

const listMemberPayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutService.getForUserGroup(req.params.groupId, req.user.id);
  return apiResponse.success(res, 200, 'Payouts retrieved.', { payouts });
});

const listPlatformPayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutService.getForPlatform();
  return apiResponse.success(res, 200, 'Platform payouts retrieved.', { payouts });
});

module.exports = {
  createPayout,
  retryPayout,
  listGroupPayouts,
  listMemberPayouts,
  listPlatformPayouts
};
