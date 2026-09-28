const paymentTransactionService = require('../services/paymentTransactionService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const listGroupTransactions = asyncHandler(async (req, res) => {
  const transactions = await paymentTransactionService.getForGroup(req.params.groupId, req.user.id);
  return apiResponse.success(res, 200, 'Group payment transactions retrieved.', { transactions });
});

const listMyTransactions = asyncHandler(async (req, res) => {
  const transactions = await paymentTransactionService.getForUserGroup(req.params.groupId, req.user.id);
  return apiResponse.success(res, 200, 'Ajo payment transactions retrieved.', { transactions });
});

const listPlatformTransactions = asyncHandler(async (req, res) => {
  const transactions = await paymentTransactionService.getForPlatform();
  return apiResponse.success(res, 200, 'Payment transactions retrieved.', { transactions });
});

module.exports = { listGroupTransactions, listMyTransactions, listPlatformTransactions };
