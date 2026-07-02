const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const {
  idParamValidator,
  requireAtLeastOneField
} = require('./commonValidators');

const memberFields = [
  'cooperative_id',
  'full_name',
  'email',
  'phone'
];

const phoneValidator = (field) =>
  body(field)
    .trim()
    .matches(/^[0-9+\-\s()]{7,30}$/)
    .withMessage('Phone must be a valid phone number.');

const createMemberValidator = [
  body('cooperative_id')
    .isInt({ min: 1 })
    .withMessage('A valid cooperative_id is required.')
    .toInt(),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Full name must be between 2 and 150 characters.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  phoneValidator('phone'),
  validateRequest
];

const updateMemberValidator = [
  ...idParamValidator,
  requireAtLeastOneField(memberFields),
  body('cooperative_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('A valid cooperative_id is required.')
    .toInt(),
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Full name must be between 2 and 150 characters.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  phoneValidator('phone').optional(),
  validateRequest
];

const memberIdValidator = [...idParamValidator, validateRequest];

module.exports = {
  createMemberValidator,
  updateMemberValidator,
  memberIdValidator
};
