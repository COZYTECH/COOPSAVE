const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const {
  idParamValidator,
  requireAtLeastOneField
} = require('./commonValidators');

const cooperativeFields = ['name', 'description'];

const createCooperativeValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Cooperative name is required.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Cooperative name must be between 2 and 150 characters.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters.'),
  validateRequest
];

const updateCooperativeValidator = [
  ...idParamValidator,
  requireAtLeastOneField(cooperativeFields),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Cooperative name cannot be empty.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Cooperative name must be between 2 and 150 characters.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters.'),
  validateRequest
];

const cooperativeIdValidator = [...idParamValidator, validateRequest];

module.exports = {
  createCooperativeValidator,
  updateCooperativeValidator,
  cooperativeIdValidator
};
