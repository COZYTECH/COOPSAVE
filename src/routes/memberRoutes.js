const express = require('express');
const memberController = require('../controllers/memberController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  createMemberValidator,
  updateMemberValidator,
  memberIdValidator
} = require('../validators/memberValidators');
const { authenticatedApiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authenticate, authenticatedApiLimiter);

router.post('/', createMemberValidator, memberController.createMember);
router.get('/', memberController.getMembers);
router.get('/:id', memberIdValidator, memberController.getMemberById);
router.put('/:id', updateMemberValidator, memberController.updateMember);
router.delete('/:id', memberIdValidator, memberController.deleteMember);

module.exports = router;
