const reconciliationService = require('../services/reconciliationService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const getReconciliation = asyncHandler(async (req, res) => {
  const reconciliation = await reconciliationService.getReconciliation(req.user.id);

  return apiResponse.success(
    res,
    200,
    'Reconciliation data retrieved.',
    reconciliation
  );
});

module.exports = {
  getReconciliation
};
