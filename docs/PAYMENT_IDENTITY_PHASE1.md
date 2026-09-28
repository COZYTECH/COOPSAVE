# Pamoja Phase 1 Payment Identity

Phase 1 uses Flutterwave test mode for membership-scoped virtual-account identities.

## Model

`payment_identities.cooperative_membership_id` is the authoritative relationship:

```text
user -> cooperative_membership -> payment_identity -> Flutterwave virtual account
```

One user can therefore have a different payment identity in each Ajo. The legacy
`members`, `virtual_accounts`, `transactions`, and Nomba webhook records remain
unchanged as historical data and are not used to resolve new Flutterwave events.

The supported provider primitive implemented here is `VIRTUAL_ACCOUNT`. The code
does not model one PSA containing multiple independently managed member accounts.

## Provisioning

Membership creation commits first. A short database transaction then creates or
reopens a `PROVISIONING` identity. The external Flutterwave call happens outside
that transaction. A successful response changes the identity to `ACTIVE`; a
provider or configuration failure changes it to `FAILED` and preserves the
membership so the operation can be retried.

The deterministic provider reference is `PAMOJA-MEMBERSHIP-<membership id>`.
This is also the retry/idempotency reference used when provisioning the same
membership again.

## Webhook flow

`POST /api/webhooks/flutterwave` accepts the raw body, verifies the
`verif-hash` header, validates the event reference, and persists the raw JSON in
`webhook_events` with `PENDING` status. Duplicate event IDs or transaction
references return `200` without another insert. Resolution and provider
transaction verification run after durable persistence. An unknown account is
marked `RECONCILIATION_REQUIRED`; it is never assigned by email, name, or user ID.

Phase 2 now creates contribution obligations from Ajo cycles and, after
provider verification, allocates payments atomically to the identity's active
obligation. It writes an immutable ledger entry for the allocated amount and
keeps any excess in `EXCESS_PENDING_REVIEW`. Payouts and refunds remain out of
scope.

## Required environment

```env
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
FLUTTERWAVE_MODE=test
FLUTTERWAVE_TIMEOUT_MS=30000
FLUTTERWAVE_VIRTUAL_ACCOUNT_PATH=/virtual-account-numbers
FLUTTERWAVE_VIRTUAL_ACCOUNT_PERMANENT=false
FLUTTERWAVE_VIRTUAL_ACCOUNT_AMOUNT=10000
```

`FLUTTERWAVE_SECRET_KEY` is server-only. Run `npm run migrate` before using the
new provisioning or webhook endpoints.
