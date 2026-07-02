const express = require('express');
const reconciliationController = require('../controllers/reconciliationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/', reconciliationController.getReconciliation);

module.exports = router;
