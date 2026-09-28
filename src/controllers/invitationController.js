const invitationService = require('../services/invitationService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const createInvitation = asyncHandler(async (req, res) => {
  const invitation = await invitationService.createInvitation({
    cooperativeId: req.params.id,
    createdBy: req.user.id,
    expiresAt: req.body.expires_at,
    maxUses: req.body.max_uses
  });

  return apiResponse.success(res, 201, 'Invitation created.', { invitation });
});

const joinInvitation = asyncHandler(async (req, res) => {
  const cooperative = await invitationService.joinExistingUser({
    token: req.body.invite_code,
    userId: req.user.id
  });

  return apiResponse.success(res, 200, 'Joined cooperative.', { cooperative });
});

module.exports = {
  createInvitation,
  joinInvitation
};
