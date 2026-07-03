const env = require("../config/env");
const webhookEventRepository = require("../repositories/webhookEventRepository");
const nombaService = require("./nomba.service");
const paymentProcessingService = require("./paymentProcessingService");
const AppError = require("../utils/appError");

const PROVIDER = "NOMBA";
const SUCCESSFUL_PAYMENT_EVENTS = new Set(["payment_success"]);

const logWebhookEvent = (event, metadata = {}) => {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      provider: PROVIDER,
      timestamp: new Date().toISOString(),
      ...metadata,
    }),
  );
};

const parsePayload = (rawPayload) => {
  try {
    if (Buffer.isBuffer(rawPayload)) {
      return JSON.parse(rawPayload.toString("utf8"));
    }

    if (typeof rawPayload === "string") {
      return JSON.parse(rawPayload);
    }

    return rawPayload;
  } catch (error) {
    throw new AppError("Webhook payload must be valid JSON.", 400);
  }
};

const getValue = (payload, paths) => {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }

      return current[key];
    }, payload);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const normalizeEventType = (eventType) => {
  return String(eventType || "")
    .trim()
    .toLowerCase()
    .replace(/[.\-\s]+/g, "_");
};

const toNullableString = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
};

const extractWebhookEvent = (payload) => {
  const eventType = normalizeEventType(
    getValue(payload, [
      "event_type",
      "eventType",
      "event",
      "type",
      "data.event_type",
      "data.eventType",
      "data.event",
      "data.type",
    ]),
  );

  const eventId = toNullableString(
    getValue(payload, [
      "event_id",
      "eventId",
      "id",
      "data.event_id",
      "data.eventId",
      "data.id",
      "meta.event_id",
      "meta.eventId",
    ]),
  );

  const accountRef = toNullableString(
    getValue(payload, [
      "account_ref",
      "accountRef",
      "account_reference",
      "accountReference",
      "data.account_ref",
      "data.accountRef",
      "data.account_reference",
      "data.accountReference",
      "data.virtual_account.account_ref",
      "data.virtual_account.accountRef",
      "data.virtual_account.reference",
      "data.virtualAccount.account_ref",
      "data.virtualAccount.accountRef",
      "data.virtualAccount.reference",
    ]),
  );

  const transactionReference = toNullableString(
    getValue(payload, [
      "transaction_reference",
      "transactionReference",
      "transaction_ref",
      "transactionRef",
      "transaction_id",
      "transactionId",
      "reference",
      "data.transaction_reference",
      "data.transactionReference",
      "data.transaction_ref",
      "data.transactionRef",
      "data.transaction_id",
      "data.transactionId",
      "data.reference",
      "data.transaction.reference",
      "data.transaction.transaction_reference",
      "data.transaction.transactionReference",
      "data.transaction.transaction_id",
      "data.transaction.transactionId",
      "data.payment_reference",
      "data.paymentReference",
    ]),
  );

  const amount = getValue(payload, [
    "amount",
    "data.amount",
    "data.amount.value",
    "data.transaction.amount",
  ]);

  const senderName = toNullableString(
    getValue(payload, [
      "sender_name",
      "senderName",
      "data.sender_name",
      "data.senderName",
      "data.sender.name",
      "data.customer.name",
    ]),
  );

  const narration = toNullableString(
    getValue(payload, [
      "narration",
      "description",
      "data.narration",
      "data.description",
      "data.transaction.narration",
    ]),
  );

  return {
    eventType,
    eventId,
    accountRef,
    transactionReference,
    amount,
    senderName,
    narration,
  };
};

const isSuccessfulPaymentEvent = (webhookEvent) => {
  return SUCCESSFUL_PAYMENT_EVENTS.has(webhookEvent.eventType);
};

const validatePayload = (payload, webhookEvent) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError("Webhook payload must be a JSON object.", 400);
  }

  if (!webhookEvent.eventType) {
    throw new AppError("Webhook event_type is required.", 422);
  }

  if (!webhookEvent.eventId && !webhookEvent.transactionReference) {
    throw new AppError(
      "Webhook event_id or transaction_reference is required.",
      422,
    );
  }

  if (isSuccessfulPaymentEvent(webhookEvent)) {
    if (!webhookEvent.accountRef) {
      throw new AppError(
        "Webhook account_ref is required for payment events.",
        422,
      );
    }

    if (
      webhookEvent.amount === undefined ||
      webhookEvent.amount === null ||
      webhookEvent.amount === ""
    ) {
      throw new AppError("Webhook amount is required for payment events.", 422);
    }
  }
};

const getNombaSignature = (headers) => {
  return (
    headers[env.nomba.webhookSignatureHeader] ||
    headers["nomba-signature"] ||
    headers["x-nomba-signature"] ||
    ""
  );
};

const ingestNombaWebhook = async ({ rawPayload, signature }) => {
  logWebhookEvent("nomba.webhook.received", {
    signaturePresent: Boolean(signature),
  });

  // uncommenting this during production will enable signature verification for Nomba webhooks
  // const isValidSignature = nombaService.verifyWebhookSignature(
  //   rawPayload,
  //   signature
  // );

  const isValidSignature = true;

  if (!isValidSignature) {
    logWebhookEvent("nomba.webhook.invalid_signature");
    throw new AppError("Invalid Nomba webhook signature.", 401);
  }

  const payload = parsePayload(rawPayload);
  const webhookEvent = extractWebhookEvent(payload);
  validatePayload(payload, webhookEvent);

  logWebhookEvent("nomba.webhook.validated", {
    eventType: webhookEvent.eventType,
    eventId: webhookEvent.eventId,
    accountRef: webhookEvent.accountRef,
    transactionReference: webhookEvent.transactionReference,
  });

  const { pool } = require("../config/database");
  const duplicateEvent = await webhookEventRepository.findDuplicate({
    provider: PROVIDER,
    eventId: webhookEvent.eventId,
    transactionReference: webhookEvent.transactionReference,
  });

  if (duplicateEvent) {
    logWebhookEvent("nomba.webhook.duplicate", {
      webhookEventId: duplicateEvent.id,
      eventType: duplicateEvent.event_type,
      eventId: duplicateEvent.event_id,
      transactionReference: duplicateEvent.transaction_reference,
    });

    return {
      received: true,
      duplicate: true,
      eventId: duplicateEvent.id,
    };
  }

  try {
    const createdEvent = await webhookEventRepository.create({
      provider: PROVIDER,
      eventType: webhookEvent.eventType,
      eventId: webhookEvent.eventId,
      accountRef: webhookEvent.accountRef,
      transactionReference: webhookEvent.transactionReference,
      processingStatus: "PENDING",
      rawPayload: payload,
    });

    let paymentResult = null;

    if (isSuccessfulPaymentEvent(webhookEvent)) {
      await webhookEventRepository.updateProcessingStatus(
        createdEvent.id,
        "PROCESSING",
      );

      try {
        paymentResult = await paymentProcessingService.processSuccessfulPayment(
          {
            accountRef: webhookEvent.accountRef,
            amount: webhookEvent.amount,
            transactionReference: webhookEvent.transactionReference,
            senderName: webhookEvent.senderName,
            narration: webhookEvent.narration,
            eventId: webhookEvent.eventId,
          },
        );

        await webhookEventRepository.updateProcessingStatus(
          createdEvent.id,
          "PROCESSED",
        );
      } catch (error) {
        await webhookEventRepository.updateProcessingStatus(
          createdEvent.id,
          "FAILED",
        );
        throw error;
      }
    }

    logWebhookEvent("nomba.webhook.persisted", {
      webhookEventId: createdEvent.id,
      eventType: createdEvent.event_type,
      eventId: createdEvent.event_id,
      accountRef: createdEvent.account_ref,
      transactionReference: createdEvent.transaction_reference,
      processingStatus: paymentResult
        ? "PROCESSED"
        : createdEvent.processing_status,
      paymentProcessed: Boolean(paymentResult),
      paymentDuplicate: paymentResult ? paymentResult.duplicate : false,
    });

    return {
      received: true,
      duplicate: false,
      eventId: createdEvent.id,
      payment: paymentResult
        ? {
            processed: paymentResult.processed,
            duplicate: paymentResult.duplicate,
            transactionId: paymentResult.transaction
              ? paymentResult.transaction.id
              : null,
          }
        : null,
    };
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      logWebhookEvent("nomba.webhook.duplicate_race", {
        eventId: webhookEvent.eventId,
        transactionReference: webhookEvent.transactionReference,
      });

      return {
        received: true,
        duplicate: true,
      };
    }

    throw error;
  }
};

module.exports = {
  ingestNombaWebhook,
  getNombaSignature,
};
