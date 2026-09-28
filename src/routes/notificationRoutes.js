const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);
router.get('/', notificationController.listNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);

module.exports = router;
