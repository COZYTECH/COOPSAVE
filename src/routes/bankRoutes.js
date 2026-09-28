const express = require('express');
const bankAccountController = require('../controllers/bankAccountController');
const { authenticate } = require('../middleware/authMiddleware');
const { listBanksValidator } = require('../validators/bankAccountValidators');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);
router.get('/', listBanksValidator, bankAccountController.listBanks);

module.exports = router;
