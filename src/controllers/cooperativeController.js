const cooperativeService = require('../services/cooperativeService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const createCooperative = asyncHandler(async (req, res) => {
  const cooperative = await cooperativeService.createCooperative(
    req.body,
    req.user.id
  );

  return apiResponse.success(res, 201, 'Cooperative created.', { cooperative });
});

const getCooperatives = asyncHandler(async (req, res) => {
  const cooperatives = await cooperativeService.getCooperatives(req.user.id);

  return apiResponse.success(res, 200, 'Cooperatives retrieved.', {
    cooperatives
  });
});

const getCooperativeById = asyncHandler(async (req, res) => {
  const cooperative = await cooperativeService.getCooperativeById(
    req.params.id,
    req.user.id
  );

  return apiResponse.success(res, 200, 'Cooperative retrieved.', { cooperative });
});

const updateCooperative = asyncHandler(async (req, res) => {
  const cooperative = await cooperativeService.updateCooperative(
    req.params.id,
    req.body,
    req.user.id
  );

  return apiResponse.success(res, 200, 'Cooperative updated.', { cooperative });
});

const deleteCooperative = asyncHandler(async (req, res) => {
  await cooperativeService.deleteCooperative(req.params.id, req.user.id);

  return apiResponse.success(res, 200, 'Cooperative deleted.');
});

module.exports = {
  createCooperative,
  getCooperatives,
  getCooperativeById,
  updateCooperative,
  deleteCooperative
};
