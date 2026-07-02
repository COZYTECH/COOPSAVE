const express = require('express');
const cooperativeController = require('../controllers/cooperativeController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  createCooperativeValidator,
  updateCooperativeValidator,
  cooperativeIdValidator
} = require('../validators/cooperativeValidators');

const router = express.Router();

router.use(authenticate);

router.post('/', createCooperativeValidator, cooperativeController.createCooperative);
router.get('/', cooperativeController.getCooperatives);
router.get(
  '/:id',
  cooperativeIdValidator,
  cooperativeController.getCooperativeById
);
router.put(
  '/:id',
  updateCooperativeValidator,
  cooperativeController.updateCooperative
);
router.delete(
  '/:id',
  cooperativeIdValidator,
  cooperativeController.deleteCooperative
);

module.exports = router;
