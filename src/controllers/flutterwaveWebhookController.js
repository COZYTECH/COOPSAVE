const flutterwaveWebhookService = require('../services/flutterwaveWebhookService');
const paymentCheckoutController = require('./paymentCheckoutController');
const asyncHandler = require('../utils/asyncHandler');

// Temporary diagnostics intentionally record request metadata only. They do not
// include the body, signature value, authorization, cookies, or credentials.
const logWebhookRequestMetadata = (req) => {
  const requestId = req.requestId || null;

  console.log(JSON.stringify({
    level: 'info',
    event: 'flutterwave.webhook.request_metadata',
    provider: 'flutterwave',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    hostname: req.hostname,
    protocol: req.protocol,
    ip: req.ip || null,
    forwardedFor: req.get('x-forwarded-for') || null,
    forwardedProto: req.get('x-forwarded-proto') || null,
    userAgent: req.get('user-agent') || null,
    origin: req.get('origin') || null,
    referer: req.get('referer') || null,
    requestId,
    verifHashPresent: Boolean(req.get('verif-hash')),
    verifHashUnderscorePresent: Boolean(req.get('verif_hash')),
    flutterwaveSignaturePresent: Boolean(req.get('flutterwave-signature'))
  }));
};

const handleFlutterwaveWebhook = asyncHandler(async (req, res) => {
  logWebhookRequestMetadata(req);

  const result = await flutterwaveWebhookService.ingest({
    rawPayload: req.body,
    signature: flutterwaveWebhookService.getSignature(req.headers)
  });

  return res.status(200).json({
    success: true,
    message: 'Webhook received.',
    data: result
  });
});

module.exports = {
  handleFlutterwaveWebhook,
  handleFlutterwaveCallback: paymentCheckoutController.handleCallback
};
