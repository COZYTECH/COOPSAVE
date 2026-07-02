const nombaWebhookIngestionService = require('../services/nombaWebhookIngestionService');
const asyncHandler = require('../utils/asyncHandler');

const handleNombaWebhook = asyncHandler(async (req, res) => {
  const signature = nombaWebhookIngestionService.getNombaSignature(req.headers);

  const result = await nombaWebhookIngestionService.ingestNombaWebhook({
    rawPayload: req.body,
    signature
  });

  return res.status(200).json({
    success: true,
    message: 'Webhook received.',
    data: result
  });
});

module.exports = {
  handleNombaWebhook
};
