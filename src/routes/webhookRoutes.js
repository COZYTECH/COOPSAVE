const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

router.post('/nomba', webhookController.handleNombaWebhook);

module.exports = router;
