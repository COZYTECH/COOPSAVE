const { pool } = require('../config/database');
const cycleRepository = require('../repositories/cycleRepository');
const obligationRepository = require('../repositories/obligationRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const AppError = require('../utils/appError');
const { toMinorUnits, toDecimal } = require('../utils/money');
const {
  normalizeFrequency,
  normalizeIntervalDays,
  normalizeGracePeriodDays,
  generateContributionPeriods
} = require('../utils/cycleSchedule');

const normalizeCurrency = (currency = 'NGN') => {
  const normalized = String(currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new AppError('Currency must be a valid three-letter code.', 422);
  }
  return normalized;
};

const normalizeDate = (value, fieldName) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} must be a valid date.`, 422);
  }
  return String(value).slice(0, 10);
};

const assertManager = async (cooperativeId, userId, db) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(cooperativeId, userId, db);
  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }
  return cooperative;
};

const toCycle = (cycle) => ({
  id: cycle.id,
  cooperativeId: cycle.cooperative_id,
  cycleNumber: cycle.cycle_number,
  name: cycle.name,
  contributionAmount: Number(cycle.contribution_amount),
  currency: cycle.currency,
  frequency: cycle.frequency,
  intervalDays: cycle.interval_days,
  startDate: cycle.start_date,
  endDate: cycle.end_date,
  gracePeriodDays: cycle.grace_period_days,
  recipientMembershipId: cycle.recipient_membership_id,
  status: cycle.status,
  ...(typeof cycle.has_financial_activity === 'boolean'
    ? { hasFinancialActivity: cycle.has_financial_activity }
    : {}),
  createdAt: cycle.created_at,
  updatedAt: cycle.updated_at
});

const toCycleMember = (member) => ({
  id: member.id,
  cycleId: member.cycle_id,
  membershipId: member.membership_id,
  position: member.position,
  expectedAmount: Number(member.expected_amount),
  currency: member.currency,
  status: member.status,
  memberName: member.member_name,
  memberEmail: member.member_email,
  createdAt: member.created_at
});

const createCycle = async ({ cooperativeId, name, contributionAmount, currency = 'NGN', frequency = 'MONTHLY', intervalDays = null, startDate, endDate = null, gracePeriodDays = 0, membershipIds = [], recipientMembershipId = null }, userId) => {
  const decimalAmount = toDecimal(toMinorUnits(contributionAmount));
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedStartDate = normalizeDate(startDate, 'start_date');
  const normalizedEndDate = endDate ? normalizeDate(endDate, 'end_date') : null;
  const normalizedFrequency = normalizeFrequency(frequency);
  const normalizedIntervalDays = normalizeIntervalDays(intervalDays, normalizedFrequency);
  const normalizedGracePeriodDays = normalizeGracePeriodDays(gracePeriodDays);

  generateContributionPeriods({
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    frequency: normalizedFrequency,
    intervalDays: normalizedIntervalDays
  });

  if (normalizedEndDate && normalizedEndDate < normalizedStartDate) {
    throw new AppError('end_date cannot be before start_date.', 422);
  }

  const connection = await pool.getConnection();
  let cycle;

  try {
    await connection.beginTransaction();
    await assertManager(cooperativeId, userId, connection);

    const memberships = await groupMembershipRepository.findAllByCooperativeId(
      cooperativeId,
      connection
    );
    const requestedIds = membershipIds.map((id) => String(id));
    const selected = requestedIds.length === 0
      ? memberships
      : memberships.filter((membership) => requestedIds.includes(String(membership.id)));

    if (selected.length === 0) {
      throw new AppError('At least one valid cooperative membership is required.', 422);
    }
    if (requestedIds.length !== selected.length) {
      throw new AppError('One or more selected memberships do not belong to this cooperative.', 422);
    }

    if (recipientMembershipId && !selected.some((membership) => String(membership.id) === String(recipientMembershipId))) {
      throw new AppError('Payout recipient must be a member of this cycle.', 422);
    }

    const cycleNumber = await cycleRepository.getNextCycleNumber(cooperativeId, connection);
    cycle = await cycleRepository.create({
      cooperativeId,
      cycleNumber,
      name,
      contributionAmount: decimalAmount,
      currency: normalizedCurrency,
      frequency: normalizedFrequency,
      intervalDays: normalizedIntervalDays,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      gracePeriodDays: normalizedGracePeriodDays,
      recipientMembershipId
    }, connection);

    for (const [index, membership] of selected.entries()) {
      await cycleRepository.addMember({
        cycleId: cycle.id,
        membershipId: membership.id,
        position: index + 1,
        expectedAmount: decimalAmount,
        currency: normalizedCurrency
      }, connection);
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

  return getCycle(cooperativeId, cycle.id, userId);
};

const setRecipient = async (cooperativeId, cycleId, recipientMembershipId, userId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertManager(cooperativeId, userId, connection);
    const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId, connection, true);
    if (!cycle) throw new AppError('Cycle not found.', 404);
    if (!['DRAFT', 'ACTIVE'].includes(cycle.status)) {
      throw new AppError('Payout recipient can only be configured before cycle completion.', 409);
    }
    const directMembership = await groupMembershipRepository.findAllByCooperativeId(cooperativeId, connection);
    const selectedMembership = directMembership.find((item) => String(item.id) === String(recipientMembershipId));
    if (!selectedMembership) throw new AppError('Payout recipient must belong to this cooperative.', 422);
    const updated = await cycleRepository.setRecipient(cycleId, selectedMembership.id, connection);
    await connection.commit();
    return updated;
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }
};

const startCycle = async (cooperativeId, cycleId, userId) => {
  const connection = await pool.getConnection();
  let startedCycle;

  try {
    await connection.beginTransaction();
    await assertManager(cooperativeId, userId, connection);
    const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId, connection, true);

    if (!cycle) {
      throw new AppError('Cycle not found.', 404);
    }
    if (cycle.status !== 'DRAFT') {
      throw new AppError('Only draft cycles can be started.', 409);
    }

    const cycleMembers = await cycleRepository.findMembers(cycleId, connection);
    if (cycleMembers.length === 0) {
      throw new AppError('A cycle must have at least one member.', 422);
    }

    const periods = generateContributionPeriods({
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      frequency: cycle.frequency,
      intervalDays: cycle.interval_days
    });

    for (const period of periods) {
      const dueAt = `${period} 00:00:00`;
      for (const member of cycleMembers) {
        await obligationRepository.createIfMissing({
          cycleId,
          cycleMemberId: member.id,
          membershipId: member.membership_id,
          expectedAmount: member.expected_amount,
          currency: member.currency,
          dueAt
        }, connection);
      }
    }

    startedCycle = await cycleRepository.activate(cycleId, connection);
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

  return getCycle(cooperativeId, startedCycle.id, userId);
};

const previewCycle = async ({ cooperativeId, name, contributionAmount, currency = 'NGN', frequency = 'MONTHLY', intervalDays = null, startDate, endDate = null, gracePeriodDays = 0, membershipIds = [] }, userId) => {
  await assertManager(cooperativeId, userId);
  const normalizedFrequency = normalizeFrequency(frequency);
  const normalizedIntervalDays = normalizeIntervalDays(intervalDays, normalizedFrequency);
  const normalizedGracePeriodDays = normalizeGracePeriodDays(gracePeriodDays);
  const periods = generateContributionPeriods({
    startDate,
    endDate,
    frequency: normalizedFrequency,
    intervalDays: normalizedIntervalDays
  });
  const memberships = await groupMembershipRepository.findAllByCooperativeId(cooperativeId);
  const selectedCount = membershipIds.length === 0
    ? memberships.length
    : memberships.filter((membership) => membershipIds.map(String).includes(String(membership.id))).length;
  const amount = Number(toDecimal(toMinorUnits(contributionAmount)));

  return {
    name,
    frequency: normalizedFrequency,
    intervalDays: normalizedIntervalDays,
    gracePeriodDays: normalizedGracePeriodDays,
    periods,
    periodCount: periods.length,
    contributionAmount: amount,
    memberCount: selectedCount,
    expectedCycleAmount: amount * periods.length * selectedCount
  };
};

const listCycles = async (cooperativeId, userId) => {
  const cooperative = await cooperativeRepository.findByIdAndUserId(cooperativeId, userId);
  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }
  const cycles = await cycleRepository.findAllByCooperativeId(cooperativeId);
  return Promise.all(cycles.map(async (cycle) => ({
    ...toCycle(cycle),
    hasFinancialActivity: (await cycleRepository.getFinancialActivity(cycle.id)).hasFinancialActivity
  })));
};

const getCycle = async (cooperativeId, cycleId, userId) => {
  const cooperative = await cooperativeRepository.findByIdAndUserId(cooperativeId, userId);
  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }
  const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId);
  if (!cycle) {
    throw new AppError('Cycle not found.', 404);
  }
  const [members, obligations] = await Promise.all([
    cycleRepository.findMembers(cycleId),
    obligationRepository.findAllByCycleId(cycleId)
  ]);
  return {
    ...toCycle(cycle),
    hasFinancialActivity: (await cycleRepository.getFinancialActivity(cycleId)).hasFinancialActivity,
    members: members.map(toCycleMember),
    obligations: obligations.map((obligation) => ({
      id: obligation.id,
      membershipId: obligation.membership_id,
      memberName: obligation.member_name,
      memberEmail: obligation.member_email,
      expectedAmount: Number(obligation.expected_amount),
      currency: obligation.currency,
      dueAt: obligation.due_at,
      status: obligation.status,
      amountPaid: Number(obligation.amount_paid),
      amountOutstanding: Number(obligation.amount_outstanding),
      amountExcess: Number(obligation.amount_excess)
    }))
  };
};

const deleteCycle = async (cooperativeId, cycleId, userId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertManager(cooperativeId, userId, connection);
    const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId, connection, true);
    if (!cycle) throw new AppError('Cycle not found.', 404);
    if (cycle.status !== 'DRAFT') {
      throw new AppError(
        'Only draft cycles without financial activity can be deleted.',
        409,
        null,
        'CYCLE_CANNOT_BE_DELETED'
      );
    }

    const activity = await cycleRepository.getFinancialActivity(cycleId, connection);
    if (activity.hasFinancialActivity) {
      throw new AppError(
        'This cycle cannot be deleted because it already has financial activity.',
        409,
        null,
        'CYCLE_HAS_FINANCIAL_ACTIVITY'
      );
    }

    await cycleRepository.deleteDraft(cycleId, connection);
    await connection.commit();
    return { id: cycleId };
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }
};

const cancelCycle = async (cooperativeId, cycleId, userId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertManager(cooperativeId, userId, connection);
    const cycle = await cycleRepository.findByIdAndCooperative(cycleId, cooperativeId, connection, true);
    if (!cycle) throw new AppError('Cycle not found.', 404);
    if (!['DRAFT', 'ACTIVE'].includes(cycle.status)) {
      throw new AppError('This cycle cannot be cancelled in its current state.', 409, null, 'CYCLE_CANNOT_BE_CANCELLED');
    }
    const cancelled = await cycleRepository.cancel(cycleId, connection);
    await connection.commit();
    return cancelled;
  } catch (error) {
    try { await connection.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    throw error;
  } finally {
    connection.release();
  }
};

const toMemberCycle = (cycle, obligations) => {
  const expectedAmount = obligations.reduce((sum, item) => sum + Number(item.expected_amount || 0), 0);
  const amountPaid = obligations.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
  const amountOutstanding = obligations.reduce((sum, item) => sum + Number(item.amount_outstanding || 0), 0);
  return {
    ...toCycle(cycle),
    expectedAmount,
    amountPaid,
    amountOutstanding,
    progress: expectedAmount > 0 ? Math.round((amountPaid / expectedAmount) * 100) : 0,
    obligations: obligations.map((obligation) => ({
      id: obligation.id,
      cycleId: obligation.cycle_id,
      membershipId: obligation.membership_id,
      expectedAmount: Number(obligation.expected_amount),
      currency: obligation.currency,
      dueAt: obligation.due_at,
      status: obligation.status,
      amountPaid: Number(obligation.amount_paid),
      amountOutstanding: Number(obligation.amount_outstanding),
      amountExcess: Number(obligation.amount_excess),
      createdAt: obligation.created_at,
      updatedAt: obligation.updated_at
    }))
  };
};

const listMemberCycles = async (userId, cooperativeId) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) throw new AppError('Cooperative membership not found.', 404);
  const cycles = await cycleRepository.findAllByMembershipId(membership.id);
  return Promise.all(cycles.map(async (cycle) => (
    toMemberCycle(
      cycle,
      await obligationRepository.findAllByCycleAndMembershipId(cycle.id, membership.id)
    )
  )));
};

const getMemberCycle = async (userId, cooperativeId, cycleId) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) throw new AppError('Cooperative membership not found.', 404);
  const cycle = await cycleRepository.findByIdAndMembershipId(cycleId, membership.id);
  if (!cycle || String(cycle.cooperative_id) !== String(cooperativeId)) {
    throw new AppError('Cycle not found.', 404);
  }
  const obligations = await obligationRepository.findAllByCycleAndMembershipId(cycleId, membership.id);
  return toMemberCycle(cycle, obligations);
};

module.exports = {
  createCycle,
  previewCycle,
  startCycle,
  listCycles,
  getCycle,
  deleteCycle,
  cancelCycle,
  listMemberCycles,
  getMemberCycle,
  setRecipient,
  toCycle,
  toCycleMember
};
