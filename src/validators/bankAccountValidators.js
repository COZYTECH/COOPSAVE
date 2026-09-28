const { body, query } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const listBanksValidator = [
  query('country').optional().isLength({ min: 2, max: 2 }).withMessage('Country must be an ISO-2 code.'),
  validateRequest
];

const verifyBankAccountValidator = [
  body('bank_code').trim().notEmpty().isLength({ max: 30 }).withMessage('Bank code is required.'),
  body('bank_name').optional().trim().isLength({ max: 150 }),
  body('account_number').trim().matches(/^\d{10}$/).withMessage('Account number must contain 10 digits.'),
  body('country').optional().isLength({ min: 2, max: 2 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  validateRequest
];

module.exports = { listBanksValidator, verifyBankAccountValidator };
