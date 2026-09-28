# Pamoja Phase 2 Financial Model

## Payment flow

```text
Flutterwave webhook
  -> webhook_events (raw, deduplicated)
  -> payment_identity (cooperative_membership_id)
  -> payment_transactions
  -> active ajo cycle
  -> contribution_obligation
  -> obligation_allocations + ledger_entries
```

The payment identity is the Ajo boundary. Email, user ID, legacy `members.id`,
and sender name are not payment-routing keys. A user who belongs to two Ajos
has two independent identities and obligations.

## HTTP surface

All routes below require a CoopSave JWT unless marked as a webhook. Group
routes also enforce membership or `GROUP_ADMIN` access as shown.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/webhooks/flutterwave` | Provider signature | Persist, verify, deduplicate, and process a Flutterwave payment event. |
| GET | `/api/groups/:groupId/cycles` | Group member | List cycles for one Ajo. |
| POST | `/api/groups/:groupId/cycles` | Group admin | Create a draft cycle and snapshot its members. |
| POST | `/api/groups/:groupId/cycles/:cycleId/start` | Group admin | Create one obligation per cycle member and activate the cycle. |
| GET | `/api/groups/:groupId/obligations` | Group admin | View obligations for one Ajo. |
| GET | `/api/groups/:groupId/transactions` | Group admin | View normalized transactions for one Ajo. |
| GET | `/api/me/ajo-contributions/:groupId` | Group member | View the signed-in member's obligations in one Ajo. |
| GET | `/api/me/ajo-contributions/:groupId/transactions` | Group member | View the signed-in member's transactions in one Ajo. |
| GET | `/api/admin/payment-transactions` | Platform admin | View normalized transactions across Ajos. |

## Allocation rules

Amounts are validated and compared in minor units. An exact payment marks the
obligation `PAID`; a partial payment marks it `PARTIAL`; multiple payments
accumulate against the same locked obligation. Excess is retained on both the
obligation and allocation record and marks the payment
`EXCESS_PENDING_REVIEW`. No amount is silently discarded.

If no active obligation exists, the provider payment is retained as a normalized
transaction with `RECONCILIATION_REQUIRED` allocation status. It is not forced
onto another cycle or member.

## Consistency and idempotency

The payment identity and active obligation are locked in one MySQL transaction.
The transaction row, state history, allocation, obligation update, and ledger
entry commit together. Provider transaction/reference uniqueness and webhook
event uniqueness protect duplicate deliveries. Ledger entries are append-only;
database triggers reject updates and deletes.

Socket.IO emits `contribution.allocated`, `payment.received`, and the legacy
`payment_received` event only after the transaction commits. Clients should
refresh their scoped Ajo query when they receive one of these events.

## Not in Phase 2

Payouts, bank transfers, withdrawals, bank verification, refunds, treasury,
loans, investments, bills, and production Flutterwave mode are intentionally
not implemented.
