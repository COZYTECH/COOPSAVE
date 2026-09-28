const express = require('express');
const reconciliationController = require('../controllers/reconciliationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePlatformAdmin } = require('../middleware/roleMiddleware');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

// Keep the legacy path for compatibility, but enforce the platform boundary.
router.use(authenticate, authenticatedApiLimiter, requirePlatformAdmin);
router.get('/', reconciliationController.getReconciliation);

module.exports = router;
