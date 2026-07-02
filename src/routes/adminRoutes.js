const express = require('express');
const nombaAdminController = require('../controllers/nombaAdminController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.post('/nomba/sync', nombaAdminController.syncVirtualAccounts);

module.exports = router;
