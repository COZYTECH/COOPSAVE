const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const AppError = require('../utils/appError');

const requireGroupRole = (requiredRole = null) => async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    const cooperative = await cooperativeRepository.findById(groupId);

    if (!cooperative) {
      throw new AppError('Cooperative not found.', 404);
    }

    const membership = await groupMembershipRepository.findByUserAndCooperative(
      req.user.id,
      groupId
    );
    const isOwner = String(cooperative.owner_id) === String(req.user.id);
    const effectiveRole = isOwner ? 'GROUP_ADMIN' : membership?.role;

    if (!effectiveRole) {
      throw new AppError('Cooperative not found.', 404);
    }

    if (requiredRole && effectiveRole !== requiredRole) {
      throw new AppError('Group administrator access is required.', 403);
    }

    req.group = {
      cooperative,
      membership,
      role: effectiveRole,
      isOwner
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireGroupRole
};
