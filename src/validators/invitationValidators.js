const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { idParamValidator } = require('./commonValidators');

const createInvitationValidator = [
  ...idParamValidator,
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('Invitation expiry must be a valid date.'),
  body('max_uses')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maximum uses must be between 1 and 1000.'),
  validateRequest
];

const joinInvitationValidator = [
  body('invite_code')
    .trim()
    .notEmpty()
    .withMessage('An invitation code is required.'),
  validateRequest
];

module.exports = {
  createInvitationValidator,
  joinInvitationValidator
};
