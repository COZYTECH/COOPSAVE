const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const cycleParamsValidator = [
  param('groupId').isInt({ min: 1 }).withMessage('Group ID must be a positive integer.').toInt(),
  param('cycleId').isInt({ min: 1 }).withMessage('Cycle ID must be a positive integer.').toInt(),
  validateRequest
];

const createCycleValidator = [
  param('groupId').isInt({ min: 1 }).withMessage('Group ID must be a positive integer.').toInt(),
  body('name').trim().notEmpty().isLength({ max: 150 }).withMessage('Cycle name is required.'),
  body('contribution_amount')
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('Contribution amount must be a positive decimal with at most two fraction digits.'),
  // Currency codes use ISO 4217-style three-letter values such as NGN.
  // isISO31661Alpha3() is for country codes and would incorrectly reject NGN.
  body('currency')
    .optional()
    .trim()
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('Currency must be a three-letter code.'),
  body('frequency').optional().trim().isLength({ min: 2, max: 30 }),
  body('interval_days').optional().isInt({ min: 1, max: 3650 }).toInt(),
  body('start_date').isISO8601().withMessage('A valid start_date is required.'),
  body('end_date').optional().isISO8601().withMessage('end_date must be a valid date.'),
  body('grace_period_days').optional().isInt({ min: 0, max: 365 }).toInt(),
  body('membership_ids').optional().isArray().withMessage('membership_ids must be an array.'),
  body('membership_ids.*').optional().isInt({ min: 1 }).toInt(),
  body('recipient_membership_id').optional().isInt({ min: 1 }).toInt(),
  validateRequest
];

const previewCycleValidator = [...createCycleValidator];

const recipientValidator = [
  param('groupId').isInt({ min: 1 }).withMessage('Group ID must be a positive integer.').toInt(),
  param('cycleId').isInt({ min: 1 }).withMessage('Cycle ID must be a positive integer.').toInt(),
  body('recipient_membership_id').isInt({ min: 1 }).toInt().withMessage('A payout recipient membership is required.'),
  validateRequest
];

module.exports = {
  cycleParamsValidator,
  createCycleValidator,
  previewCycleValidator,
  recipientValidator
};
