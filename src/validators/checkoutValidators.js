const { param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const checkoutParamsValidator = [
  param('groupId')
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer.')
    .toInt(),
  param('obligationId')
    .isInt({ min: 1 })
    .withMessage('Obligation ID must be a positive integer.')
    .toInt(),
  validateRequest
];

module.exports = { checkoutParamsValidator };
