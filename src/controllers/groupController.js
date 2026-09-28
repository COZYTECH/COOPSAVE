const cooperativeService = require('../services/cooperativeService');
const memberService = require('../services/memberService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const getGroup = asyncHandler(async (req, res) => {
  const cooperative = await cooperativeService.getCooperativeById(
    req.params.groupId,
    req.user.id
  );

  return apiResponse.success(res, 200, 'Group retrieved.', { group: cooperative });
});

const getManagedMembers = asyncHandler(async (req, res) => {
  const members = await memberService.getMembersForCooperative(
    req.params.groupId,
    req.user.id
  );

  return apiResponse.success(res, 200, 'Group members retrieved.', { members });
});

module.exports = {
  getGroup,
  getManagedMembers
};
