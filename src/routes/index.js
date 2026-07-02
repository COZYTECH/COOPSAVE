const express = require('express');
const authRoutes = require('./authRoutes');
const cooperativeRoutes = require('./cooperativeRoutes');
const memberRoutes = require('./memberRoutes');
const webhookRoutes = require('./webhookRoutes');
const reconciliationRoutes = require('./reconciliationRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/cooperatives', cooperativeRoutes);
router.use('/members', memberRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/reconciliation', reconciliationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
