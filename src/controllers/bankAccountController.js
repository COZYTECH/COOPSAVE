const bankAccountService = require('../services/bankAccountService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const listBanks = asyncHandler(async (req, res) => {
  const banks = await bankAccountService.listBanks(req.query.country);
  return apiResponse.success(res, 200, 'Banks retrieved.', { banks });
});

const listMyAccounts = asyncHandler(async (req, res) => {
  const accounts = await bankAccountService.listForUser({
    userId: req.user.id,
    cooperativeId: req.params.groupId
  });
  return apiResponse.success(res, 200, 'Bank accounts retrieved.', { accounts });
});

const verifyMyAccount = asyncHandler(async (req, res) => {
  const account = await bankAccountService.verifyForUser({
    userId: req.user.id,
    cooperativeId: req.params.groupId,
    bankCode: req.body.bank_code,
    bankName: req.body.bank_name,
    accountNumber: req.body.account_number,
    country: req.body.country,
    currency: req.body.currency
  });
  return apiResponse.success(res, 200, 'Bank account verified.', { account });
});

module.exports = { listBanks, listMyAccounts, verifyMyAccount };
