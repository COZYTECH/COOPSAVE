const obligationRepository = require('../repositories/obligationRepository');
const cycleRepository = require('../repositories/cycleRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const AppError = require('../utils/appError');

const toObligation = (obligation) => ({
  id: obligation.id,
  cycleId: obligation.cycle_id,
  cycleMemberId: obligation.cycle_member_id,
  membershipId: obligation.membership_id,
  expectedAmount: Number(obligation.expected_amount),
  currency: obligation.currency,
  dueAt: obligation.due_at,
  status: obligation.status,
  amountPaid: Number(obligation.amount_paid),
  amountOutstanding: Number(obligation.amount_outstanding),
  amountExcess: Number(obligation.amount_excess),
  cycleName: obligation.cycle_name,
  cycleNumber: obligation.cycle_number,
  cooperativeId: obligation.cooperative_id,
  cooperativeName: obligation.cooperative_name,
  memberName: obligation.member_name,
  memberEmail: obligation.member_email,
  createdAt: obligation.created_at,
  updatedAt: obligation.updated_at
});

const getForGroup = async (cooperativeId, userId, cycleId = null) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(cooperativeId, userId);
  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }
  let obligations;
  if (cycleId) {
    const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId);
    if (!cycle) {
      throw new AppError('Cycle not found.', 404);
    }
    obligations = await obligationRepository.findAllByCycleId(cycleId);
  } else {
    obligations = await obligationRepository.findAllByCooperativeId(cooperativeId);
  }
  return obligations.map(toObligation);
};

const getForUser = async (userId, cooperativeId = null) => {
  if (cooperativeId) {
    const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
    if (!membership) {
      throw new AppError('Cooperative membership not found.', 404);
    }
    const obligations = await obligationRepository.findAllByUserId(userId);
    return obligations
      .filter((obligation) => String(obligation.cooperative_id) === String(cooperativeId))
      .map(toObligation);
  }
  return (await obligationRepository.findAllByUserId(userId)).map(toObligation);
};

module.exports = {
  getForGroup,
  getForUser,
  toObligation
};
