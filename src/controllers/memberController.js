const memberService = require('../services/memberService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const createMember = asyncHandler(async (req, res) => {
  const member = await memberService.createMember(req.body, req.user.id);

  return apiResponse.success(res, 201, 'Member created.', { member });
});

const getMembers = asyncHandler(async (req, res) => {
  const members = await memberService.getMembers(req.user.id);

  return apiResponse.success(res, 200, 'Members retrieved.', { members });
});

const getMemberById = asyncHandler(async (req, res) => {
  const member = await memberService.getMemberById(req.params.id, req.user.id);

  return apiResponse.success(res, 200, 'Member retrieved.', { member });
});

const updateMember = asyncHandler(async (req, res) => {
  const member = await memberService.updateMember(
    req.params.id,
    req.body,
    req.user.id
  );

  return apiResponse.success(res, 200, 'Member updated.', { member });
});

const deleteMember = asyncHandler(async (req, res) => {
  await memberService.deleteMember(req.params.id, req.user.id);

  return apiResponse.success(res, 200, 'Member deleted.');
});

module.exports = {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember
};
