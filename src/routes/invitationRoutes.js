const express = require('express');
const invitationController = require('../controllers/invitationController');
const { authenticate } = require('../middleware/authMiddleware');
const { joinInvitationValidator } = require('../validators/invitationValidators');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);
router.post('/join', joinInvitationValidator, invitationController.joinInvitation);

module.exports = router;
