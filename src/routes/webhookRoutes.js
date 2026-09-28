const express = require('express');
const flutterwaveWebhookController = require('../controllers/flutterwaveWebhookController');

const router = express.Router();

router.post('/flutterwave', flutterwaveWebhookController.handleFlutterwaveWebhook);
router.get('/flutterwave/callback', flutterwaveWebhookController.handleFlutterwaveCallback);

module.exports = router;
