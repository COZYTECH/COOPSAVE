const obligationService = require('../services/obligationService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const getMyContributions = asyncHandler(async (req, res) => {
  const obligations = await obligationService.getForUser(req.user.id);
  return apiResponse.success(res, 200, 'Contributions retrieved.', { obligations });
});

const getMyGroupContributions = asyncHandler(async (req, res) => {
  const obligations = await obligationService.getForUser(req.user.id, req.params.groupId);
  return apiResponse.success(res, 200, 'Ajo contributions retrieved.', { obligations });
});

module.exports = {
  getMyContributions,
  getMyGroupContributions
};
