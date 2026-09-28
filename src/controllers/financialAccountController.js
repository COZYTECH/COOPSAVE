const financialAccountService = require('../services/financialAccountService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const listFinancialAccounts = asyncHandler(async (req, res) => {
  const data = await financialAccountService.getList(req.query);
  return apiResponse.success(res, 200, 'Financial accounts retrieved.', data);
});

const getFinancialAccount = asyncHandler(async (req, res) => {
  const data = await financialAccountService.getDetails(req.params.groupId, {
    ...req.query,
    cycleId: req.params.cycleId || req.query.cycleId
  });
  return apiResponse.success(res, 200, 'Financial account details retrieved.', data);
});

module.exports = {
  listFinancialAccounts,
  getFinancialAccount
};
