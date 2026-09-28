# Pamoja Phase 3: Payouts

Phase 3 adds recipient verification, explicit cycle payout eligibility, payout
attempt tracking, Flutterwave transfer initiation, transfer webhook
reconciliation, and payout views. Flutterwave is hard-gated to `test` mode;
this phase must not move production money.

## Policy

- A cycle has one explicitly configured `recipient_membership_id`.
- A recipient must belong to the cooperative and have a `VERIFIED` bank account.
- Only `ACTIVE` and `COMPLETED` cycles are eligible by default.
- All required contribution obligations must be satisfied and the cycle must
  have no payment reconciliation exceptions.
- The payout amount is the available verified ledger credit after completed
  payout debits and reserved payout amounts.
- The system never silently rotates recipients. A manager must configure the
  recipient explicitly.
- A provider failure marks the payout `FAILED` and makes it eligible for a
  controlled retry. A timeout or unverified provider state becomes
  `RECONCILIATION_REQUIRED` and is never retried automatically.

## Provider boundary

The adapter uses the Flutterwave v3 API in test mode:

- `POST /v3/accounts/resolve` verifies a bank account.
- `GET /v3/banks/{country}` lists banks.
- `POST /v3/transfers` initiates a transfer.
- `GET /v3/transfers/{id}` verifies the final transfer state.

Secret keys stay on the backend. Account numbers are encrypted at rest,
hashed for lookup, and returned to clients only as masked values.

## API

All routes require a valid JWT.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/banks?country=NG` | Authenticated | List sandbox bank codes. |
| GET | `/api/groups/:groupId/bank-accounts` | Group member | List the current user's verified accounts for the Ajo. |
| POST | `/api/groups/:groupId/bank-accounts/verify` | Group member | Verify and store a bank account. Body: `bank_code`, `account_number`, optional `bank_name`, `country`, `currency`. |
| PATCH | `/api/groups/:groupId/cycles/:cycleId/recipient` | Group admin | Configure the cycle's explicit recipient. |
| GET | `/api/groups/:groupId/cycles/:cycleId/payout-eligibility` | Group admin | Return eligibility reasons, recipient, bank account, and ledger amount. |
| POST | `/api/groups/:groupId/cycles/:cycleId/payouts` | Group admin | Reserve an eligible payout and initiate a Flutterwave test transfer. |
| GET | `/api/groups/:groupId/payouts` | Group admin | List payouts for a cooperative. |
| POST | `/api/groups/:groupId/payouts/:payoutId/retry` | Group admin | Retry only a confirmed `FAILED` payout. |
| GET | `/api/me/ajo-payouts/:groupId` | Group member | View payouts where the current member is the recipient. |
| GET | `/api/admin/payouts` | Platform admin | View all payout records and states. |
| POST | `/api/webhooks/flutterwave` | Flutterwave | Persist, deduplicate, verify, and process transfer webhooks. |

## State flow

```text
DRAFT / ELIGIBLE -> INITIATED -> PENDING -> SUCCESS
                              -> FAILED -> controlled retry
                              -> RECONCILIATION_REQUIRED
```

Only a verified `SUCCESSFUL` provider response creates the payout `DEBIT`
ledger entry. A duplicate webhook sees the terminal payout state and cannot
create a second debit.

## Database

Migration `010_create_payout_core.js` creates:

- `verified_bank_accounts`
- `payouts`
- `payout_attempts`
- `payout_status_history`

It also adds `ajo_cycles.recipient_membership_id` and
`ledger_entries.payout_id`. Apply it with:

```bash
npm run migrate
```

Required environment variables are documented in `.env.example`, including
`FLUTTERWAVE_MODE=test` and `PAYOUT_BANK_ENCRYPTION_KEY`.
