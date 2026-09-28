const env = require('../config/env');
const paymentCheckoutService = require('../services/paymentCheckoutService');
const asyncHandler = require('../utils/asyncHandler');
const apiResponse = require('../utils/apiResponse');

const createCheckout = asyncHandler(async (req, res) => {
  const checkout = await paymentCheckoutService.createCheckout({
    groupId: req.params.groupId,
    obligationId: req.params.obligationId,
    userId: req.user.id
  });

  return apiResponse.success(res, 201, 'Flutterwave checkout created.', { checkout });
});

const handleCallback = asyncHandler(async (req, res) => {
  const result = await paymentCheckoutService.handleCallback({
    status: req.query.status,
    transactionReference: req.query.tx_ref || req.query.transaction_reference,
    transactionId: req.query.transaction_id || req.query.id
  });

  if (!env.flutterwave.checkoutResultUrl) {
    return apiResponse.success(res, 200, 'Flutterwave checkout result verified.', { result });
  }

  const redirectUrl = new URL(env.flutterwave.checkoutResultUrl);
  redirectUrl.searchParams.set('status', result.status);
  redirectUrl.searchParams.set('tx_ref', result.transactionReference);
  if (result.transactionId) {
    redirectUrl.searchParams.set('transaction_id', result.transactionId);
  }
  return res.redirect(303, redirectUrl.toString());
});

module.exports = { createCheckout, handleCallback };
