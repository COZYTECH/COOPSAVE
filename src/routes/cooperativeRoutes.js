const express = require('express');
const cooperativeController = require('../controllers/cooperativeController');
const invitationController = require('../controllers/invitationController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  createCooperativeValidator,
  updateCooperativeValidator,
  cooperativeIdValidator
} = require('../validators/cooperativeValidators');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');
const { createInvitationValidator } = require('../validators/invitationValidators');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);

router.post('/', createCooperativeValidator, cooperativeController.createCooperative);
router.post(
  '/:id/invitations',
  createInvitationValidator,
  invitationController.createInvitation
);
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
