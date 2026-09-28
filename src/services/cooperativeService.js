const { pool } = require('../config/database');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const AppError = require('../utils/appError');
const { toCooperative } = require('../models/cooperativeModel');
const paymentIdentityService = require('./paymentIdentityService');

const createCooperative = async ({ name, description }, ownerId) => {
  const connection = await pool.getConnection();
  let cooperative;

  try {
    await connection.beginTransaction();

    cooperative = await cooperativeRepository.create({
      name,
      description: description || null,
      ownerId
    }, connection);

    await groupMembershipRepository.create({
      cooperativeId: cooperative.id,
      userId: ownerId,
      role: 'GROUP_ADMIN'
    }, connection);

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

  await paymentIdentityService.provisionForUserMembership({
    userId: ownerId,
    cooperativeId: cooperative.id
  });
  return toCooperative(cooperative);
};

const getCooperatives = async (ownerId) => {
  const cooperatives = await cooperativeRepository.findAllByUserId(ownerId);
  return cooperatives.map(toCooperative);
};

const getCooperativeById = async (id, ownerId) => {
  const cooperative = await cooperativeRepository.findByIdAndUserId(id, ownerId);

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  return toCooperative(cooperative);
};

const updateCooperative = async (id, payload, ownerId) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(id, ownerId);

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  const updatedCooperative = await cooperativeRepository.updateById(id, {
    name: payload.name !== undefined ? payload.name : cooperative.name,
    description:
      payload.description !== undefined
        ? payload.description || null
        : cooperative.description
  });

  return toCooperative(updatedCooperative);
};

const deleteCooperative = async (id, ownerId) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(id, ownerId);

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  await cooperativeRepository.deleteById(id);
};

module.exports = {
  createCooperative,
  getCooperatives,
  getCooperativeById,
  updateCooperative,
  deleteCooperative
};
