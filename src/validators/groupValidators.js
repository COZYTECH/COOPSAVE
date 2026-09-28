const { param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const groupIdValidator = [
  param('groupId')
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer.'),
  validateRequest
];

module.exports = {
  groupIdValidator
};
