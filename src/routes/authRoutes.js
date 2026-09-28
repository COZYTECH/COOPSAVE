const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  registerValidator,
  loginValidator
} = require('../validators/authValidators');
const { loginLimiter, loginAccountLimiter, registerLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.post('/register', registerLimiter, registerValidator, authController.register);
router.post('/login', loginLimiter, loginAccountLimiter, loginValidator, authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
