const virtualAccountSyncService = require('../services/virtualAccountSyncService');
const asyncHandler = require('../utils/asyncHandler');

const syncVirtualAccounts = asyncHandler(async (req, res) => {
  const result = await virtualAccountSyncService.syncSandboxVirtualAccounts();

  return res.status(200).json(result);
});

module.exports = {
  syncVirtualAccounts
};
