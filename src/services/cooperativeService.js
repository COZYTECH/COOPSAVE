const cooperativeRepository = require('../repositories/cooperativeRepository');
const AppError = require('../utils/appError');
const { toCooperative } = require('../models/cooperativeModel');

const createCooperative = async ({ name, description }, ownerId) => {
  const cooperative = await cooperativeRepository.create({
    name,
    description: description || null,
    ownerId
  });

  return toCooperative(cooperative);
};

const getCooperatives = async (ownerId) => {
  const cooperatives = await cooperativeRepository.findAllByOwnerId(ownerId);
  return cooperatives.map(toCooperative);
};

const getCooperativeById = async (id, ownerId) => {
  const cooperative = await cooperativeRepository.findByIdAndOwnerId(id, ownerId);

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  return toCooperative(cooperative);
};

const updateCooperative = async (id, payload, ownerId) => {
  const cooperative = await cooperativeRepository.findByIdAndOwnerId(id, ownerId);

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
  const cooperative = await cooperativeRepository.findByIdAndOwnerId(id, ownerId);

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
