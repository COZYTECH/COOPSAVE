const express = require('express');
const authRoutes = require('./authRoutes');
const cooperativeRoutes = require('./cooperativeRoutes');
const memberRoutes = require('./memberRoutes');
const webhookRoutes = require('./webhookRoutes');
const reconciliationRoutes = require('./reconciliationRoutes');
const adminRoutes = require('./adminRoutes');
const invitationRoutes = require('./invitationRoutes');
const groupRoutes = require('./groupRoutes');
const meRoutes = require('./meRoutes');
const bankRoutes = require('./bankRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/cooperatives', cooperativeRoutes);
router.use('/members', memberRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/reconciliation', reconciliationRoutes);
router.use('/admin', adminRoutes);
router.use('/invitations', invitationRoutes);
router.use('/groups', groupRoutes);
router.use('/me', meRoutes);
router.use('/banks', bankRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
