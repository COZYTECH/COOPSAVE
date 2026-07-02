const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('A valid id parameter is required.')
    .toInt()
];

const requireAtLeastOneField = (fields) =>
  body().custom((value, { req }) => {
    const hasField = fields.some((field) => req.body[field] !== undefined);

    if (!hasField) {
      throw new Error(`At least one of these fields is required: ${fields.join(', ')}.`);
    }

    return true;
  });

module.exports = {
  idParamValidator,
  requireAtLeastOneField
};
