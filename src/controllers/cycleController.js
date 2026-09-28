const cycleService = require('../services/cycleService');
const obligationService = require('../services/obligationService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const createCycle = asyncHandler(async (req, res) => {
  const cycle = await cycleService.createCycle({
    cooperativeId: req.params.groupId,
    name: req.body.name,
    contributionAmount: req.body.contribution_amount,
    currency: req.body.currency,
    frequency: req.body.frequency,
    intervalDays: req.body.interval_days,
    startDate: req.body.start_date,
    endDate: req.body.end_date,
    gracePeriodDays: req.body.grace_period_days,
    membershipIds: req.body.membership_ids || [],
    recipientMembershipId: req.body.recipient_membership_id
  }, req.user.id);

  return apiResponse.success(res, 201, 'Cycle created.', { cycle });
});

const previewCycle = asyncHandler(async (req, res) => {
  const preview = await cycleService.previewCycle({
    cooperativeId: req.params.groupId,
    name: req.body.name,
    contributionAmount: req.body.contribution_amount,
    currency: req.body.currency,
    frequency: req.body.frequency,
    intervalDays: req.body.interval_days,
    startDate: req.body.start_date,
    endDate: req.body.end_date,
    gracePeriodDays: req.body.grace_period_days,
    membershipIds: req.body.membership_ids || []
  }, req.user.id);
  return apiResponse.success(res, 200, 'Cycle schedule preview generated.', { preview });
});

const setRecipient = asyncHandler(async (req, res) => {
  const cycle = await cycleService.setRecipient(
    req.params.groupId,
    req.params.cycleId,
    req.body.recipient_membership_id,
    req.user.id
  );
  return apiResponse.success(res, 200, 'Payout recipient configured.', { cycle });
});

const listCycles = asyncHandler(async (req, res) => {
  const cycles = await cycleService.listCycles(req.params.groupId, req.user.id);
  return apiResponse.success(res, 200, 'Cycles retrieved.', { cycles });
});

const getCycle = asyncHandler(async (req, res) => {
  const cycle = await cycleService.getCycle(req.params.groupId, req.params.cycleId, req.user.id);
  return apiResponse.success(res, 200, 'Cycle retrieved.', { cycle });
});

const startCycle = asyncHandler(async (req, res) => {
  const cycle = await cycleService.startCycle(req.params.groupId, req.params.cycleId, req.user.id);
  return apiResponse.success(res, 200, 'Cycle started.', { cycle });
});

const deleteCycle = asyncHandler(async (req, res) => {
  await cycleService.deleteCycle(req.params.groupId, req.params.cycleId, req.user.id);
  return apiResponse.success(res, 200, 'Draft cycle deleted.', { cycleId: Number(req.params.cycleId) });
});

const cancelCycle = asyncHandler(async (req, res) => {
  const cycle = await cycleService.cancelCycle(req.params.groupId, req.params.cycleId, req.user.id);
  return apiResponse.success(res, 200, 'Cycle cancelled.', { cycle });
});

const listGroupObligations = asyncHandler(async (req, res) => {
  const obligations = await obligationService.getForGroup(req.params.groupId, req.user.id);
  return apiResponse.success(res, 200, 'Obligations retrieved.', { obligations });
});

const listCycleObligations = asyncHandler(async (req, res) => {
  const obligations = await obligationService.getForGroup(
    req.params.groupId,
    req.user.id,
    req.params.cycleId
  );
  return apiResponse.success(res, 200, 'Cycle obligations retrieved.', { obligations });
});

const listMemberCycles = asyncHandler(async (req, res) => {
  const cycles = await cycleService.listMemberCycles(req.user.id, req.params.groupId);
  return apiResponse.success(res, 200, 'Member cycles retrieved.', { cycles });
});

const getMemberCycle = asyncHandler(async (req, res) => {
  const cycle = await cycleService.getMemberCycle(req.user.id, req.params.groupId, req.params.cycleId);
  return apiResponse.success(res, 200, 'Member cycle retrieved.', { cycle });
});

module.exports = {
  createCycle,
  previewCycle,
  listCycles,
  getCycle,
  startCycle,
  deleteCycle,
  cancelCycle,
  setRecipient,
  listGroupObligations,
  listCycleObligations,
  listMemberCycles,
  getMemberCycle
};
