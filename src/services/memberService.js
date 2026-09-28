const { pool } = require('../config/database');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const memberRepository = require('../repositories/memberRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const AppError = require('../utils/appError');
const { toMember } = require('../models/memberModel');

const normalizeMemberPayload = (payload) => ({
  cooperativeId: payload.cooperative_id,
  fullName: payload.full_name,
  email: payload.email ? payload.email.toLowerCase() : undefined,
  phone: payload.phone
});

const assertCanManageCooperative = async (cooperativeId, ownerId, db) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(
    cooperativeId,
    ownerId,
    db
  );

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  return cooperative;
};

const assertUniqueMemberIdentity = async ({
  memberId = null,
  cooperativeId,
  email,
  accountRef
}, db) => {
  if (email) {
    const memberWithEmail = await memberRepository.findByEmailInCooperative(
      email,
      cooperativeId,
      db
    );

    if (memberWithEmail && String(memberWithEmail.id) !== String(memberId)) {
      throw new AppError('Member email already exists in this cooperative.', 409);
    }
  }

  if (accountRef) {
    const memberWithAccountRef = await memberRepository.findByAccountRef(
      accountRef,
      db
    );

    if (
      memberWithAccountRef &&
      String(memberWithAccountRef.id) !== String(memberId)
    ) {
      throw new AppError('Member account reference already exists.', 409);
    }
  }
};

const createMember = async (payload, ownerId) => {
  const memberData = normalizeMemberPayload(payload);
  const connection = await pool.getConnection();

  try {
    // This legacy directory write is intentionally separate from the new
    // membership-scoped Flutterwave payment identity flow.
    await connection.beginTransaction();

    await assertCanManageCooperative(memberData.cooperativeId, ownerId, connection);
    await assertUniqueMemberIdentity(memberData, connection);

    const member = await memberRepository.create(
      {
        ...memberData,
        accountRef: null,
        accountNumber: null,
        accountName: null
      },
      connection
    );

    await connection.commit();

    return toMember(member);
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
};

const getMembers = async (ownerId) => {
  const members = await memberRepository.findAllByManagerId(ownerId);
  return members.map(toMember);
};

const getMembersForCooperative = async (cooperativeId, userId) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(
    cooperativeId,
    userId
  );

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  const memberships = await groupMembershipRepository.findAllByCooperativeId(
    cooperativeId
  );

  return memberships.map((membership) => ({
    id: membership.id,
    cooperativeId: membership.cooperative_id,
    fullName: membership.full_name,
    email: membership.email,
    phone: null,
    accountRef: null,
    accountNumber: null,
    accountName: null,
    role: membership.role,
    createdAt: membership.created_at
  }));
};

const getMemberById = async (id, ownerId) => {
  const member = await memberRepository.findByIdAndManagerId(id, ownerId);

  if (!member) {
    throw new AppError('Member not found.', 404);
  }

  return toMember(member);
};

const updateMember = async (id, payload, ownerId) => {
  const existingMember = await memberRepository.findByIdAndManagerId(id, ownerId);

  if (!existingMember) {
    throw new AppError('Member not found.', 404);
  }

  const requestedData = normalizeMemberPayload(payload);
  const cooperativeId =
    requestedData.cooperativeId !== undefined
      ? requestedData.cooperativeId
      : existingMember.cooperative_id;

  await assertCanManageCooperative(cooperativeId, ownerId);

  const memberData = {
    cooperativeId,
    fullName:
      requestedData.fullName !== undefined
        ? requestedData.fullName
        : existingMember.full_name,
    email:
      requestedData.email !== undefined ? requestedData.email : existingMember.email,
    phone:
      requestedData.phone !== undefined ? requestedData.phone : existingMember.phone,
    accountRef: existingMember.account_ref,
    accountNumber: existingMember.account_number,
    accountName: existingMember.account_name
  };

  await assertUniqueMemberIdentity({
    memberId: id,
    cooperativeId: memberData.cooperativeId,
    email: memberData.email,
    accountRef: memberData.accountRef
  });

  const member = await memberRepository.updateById(id, memberData);
  return toMember(member);
};

const deleteMember = async (id, ownerId) => {
  const member = await memberRepository.findByIdAndManagerId(id, ownerId);

  if (!member) {
    throw new AppError('Member not found.', 404);
  }

  await memberRepository.deleteById(id);
};

module.exports = {
  createMember,
  getMembers,
  getMembersForCooperative,
  getMemberById,
  updateMember,
  deleteMember
};
