const { pool } = require('../config/database');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const memberRepository = require('../repositories/memberRepository');
const virtualAccountRepository = require('../repositories/virtualAccountRepository');
const virtualAccountProvider = require('./virtualAccountProvider');
const AppError = require('../utils/appError');
const { toMember } = require('../models/memberModel');

const normalizeMemberPayload = (payload) => ({
  cooperativeId: payload.cooperative_id,
  fullName: payload.full_name,
  email: payload.email ? payload.email.toLowerCase() : undefined,
  phone: payload.phone
});

const assertOwnsCooperative = async (cooperativeId, ownerId, db) => {
  const cooperative = await cooperativeRepository.findByIdAndOwnerId(
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
  let reservedAccount = null;

  try {
    // Member creation owns this business transaction because it spans multiple
    // domain steps: cooperative validation, account reservation, member insert,
    // and final account assignment.
    await connection.beginTransaction();

    await assertOwnsCooperative(memberData.cooperativeId, ownerId, connection);
    await assertUniqueMemberIdentity(memberData, connection);

    reservedAccount = await virtualAccountProvider.allocateAccount(
      memberData,
      connection
    );

    await assertUniqueMemberIdentity(
      {
        ...memberData,
        accountRef: reservedAccount.accountRef
      },
      connection
    );

    const member = await memberRepository.create(
      {
        ...memberData,
        accountRef: reservedAccount.accountRef,
        accountNumber: reservedAccount.accountNumber,
        accountName: reservedAccount.accountName
      },
      connection
    );

    await virtualAccountRepository.assignAccount(
      reservedAccount.id,
      member.id,
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

    if (reservedAccount) {
      try {
        await virtualAccountRepository.releaseAccount(reservedAccount.id);
      } catch (releaseError) {
        console.error(releaseError);
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

const getMembers = async (ownerId) => {
  const members = await memberRepository.findAllByOwnerId(ownerId);
  return members.map(toMember);
};

const getMemberById = async (id, ownerId) => {
  const member = await memberRepository.findByIdAndOwnerId(id, ownerId);

  if (!member) {
    throw new AppError('Member not found.', 404);
  }

  return toMember(member);
};

const updateMember = async (id, payload, ownerId) => {
  const existingMember = await memberRepository.findByIdAndOwnerId(id, ownerId);

  if (!existingMember) {
    throw new AppError('Member not found.', 404);
  }

  const requestedData = normalizeMemberPayload(payload);
  const cooperativeId =
    requestedData.cooperativeId !== undefined
      ? requestedData.cooperativeId
      : existingMember.cooperative_id;

  await assertOwnsCooperative(cooperativeId, ownerId);

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
  const member = await memberRepository.findByIdAndOwnerId(id, ownerId);

  if (!member) {
    throw new AppError('Member not found.', 404);
  }

  await memberRepository.deleteById(id);
};

module.exports = {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember
};
