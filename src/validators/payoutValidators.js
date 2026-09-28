const { param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const payoutCycleParamsValidator = [
  param('groupId').isInt({ min: 1 }).withMessage('Group ID must be a positive integer.').toInt(),
  param('cycleId').isInt({ min: 1 }).withMessage('Cycle ID must be a positive integer.').toInt(),
  validateRequest
];

const payoutRetryValidator = [
  param('groupId').isInt({ min: 1 }).withMessage('Group ID must be a positive integer.').toInt(),
  param('payoutId').isInt({ min: 1 }).withMessage('Payout ID must be a positive integer.').toInt(),
  validateRequest
];

module.exports = { payoutCycleParamsValidator, payoutRetryValidator };
