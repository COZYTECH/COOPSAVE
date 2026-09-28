# Pamoja Phase 3.5 Financial Audit

## Executive Summary

Phase 3.5 audited the implemented Pamoja Ajo financial lifecycle from a membership-scoped Flutterwave payment identity through contribution allocation, immutable ledger credit, verified recipient bank account, payout reservation, sandbox transfer, transfer webhook, and ledger debit.

The database-backed payment harness passed the tested partial-payment, excess-payment, duplicate-delivery, wrong-currency, unknown-identity, concurrent-payment, and multi-Ajo identity scenarios. The audit also removed debug logging that exposed raw Nomba webhook headers and masked the last remaining full bank-account value found in payment-identity logging.

Status is **PASS WITH BLOCKERS**. The implementation remains sandbox/test-only and is not production-ready. Production credentials, provider configuration, operational controls, and real-money verification are still intentionally outstanding.

## Current Architecture

```text
Authenticated user
  -> cooperative membership
  -> Flutterwave payment identity
  -> Flutterwave webhook and transaction verification
  -> payment transaction
  -> Ajo cycle obligation
  -> obligation allocation
  -> immutable ledger credit
  -> verified recipient bank account
  -> payout and payout attempt
  -> Flutterwave sandbox transfer
  -> transfer webhook/verification
  -> immutable ledger debit
```

The active payment runtime uses Flutterwave test mode. Payment identity lookup is keyed by provider reference, virtual-account reference, or account number and resolves to `payment_identities.cooperative_membership_id`. Email, phone, display name, and user ID alone are not webhook identity keys.

Legacy Nomba tables, migrations, services, and historical documentation remain in the repository for data and migration compatibility. No Nomba route is mounted in `src/routes/index.js`, and the active Flutterwave payment flow does not call the Nomba provider.

## Contribution Lifecycle

Payment processing locks the payment identity and the active obligation in one MySQL transaction. It creates the Pamoja transaction and status history, applies an allocation, updates the obligation, writes a CREDIT ledger entry, and commits before emitting the contribution Socket.IO event.

Amounts are normalized to integer minor units before allocation. Allocation is capped at both the payment and obligation amounts. Excess is recorded on the obligation and allocation as `EXCESS_PENDING_REVIEW`; it is not moved to another obligation and no refund is invented.

The tested result for a `10,000.00` obligation receiving `4,000.00` and `6,000.00` was `PARTIAL` then `PAID`, with outstanding balance `6,000.00` then `0.00`, two allocations, and two CREDIT ledger entries.

## Webhook Security and Idempotency

The Flutterwave webhook endpoint validates the configured `verif-hash` signature before persistence or processing. Valid payloads are stored as raw JSON in `webhook_events` with `PENDING` status. Duplicate event IDs and provider transaction references return success without creating a second event or financial effect. Processing occurs after durable persistence.

Successful-looking provider events with amount, currency, or reference mismatches are retained as `RECONCILIATION_REQUIRED`. Provider-declared failures remain `FAILED`. Unknown identities are persisted and retained for reconciliation without a transaction or ledger credit.

Flutterwave documents the `verif-hash` webhook guard and transaction verification in its [webhook documentation](https://developer.flutterwave.com/docs/webhooks). The sandbox transfer implementation follows the documented [create transfer](https://developer.flutterwave.com/reference/create-a-transfer), [bank verification](https://developer.flutterwave.com/docs/bank-account-verification-1), and [Nigerian bank transfer](https://developer.flutterwave.com/docs/nigerian-bank-account-transfer) API shape.

## Payout Lifecycle

Payout creation is group-admin controlled, checks the selected cycle recipient, verified membership-owned bank account, cycle eligibility, and available balance, then creates one payout and one attempt under a transaction. The provider request is made after the reservation commits.

Provider rejection becomes `FAILED` and does not create a debit. Network or uncertain provider outcomes become `RECONCILIATION_REQUIRED`/`UNKNOWN` and do not create a debit. A confirmed successful transfer is verified against amount, currency, reference, bank code, and account number before the payout is marked `SUCCESS` and a single DEBIT ledger entry is created. Duplicate successful transfer webhooks are ignored after the payout lock sees `SUCCESS`.

The payout state machine was exercised against a disposable migrated database with the provider boundary stubbed: successful transfer produced one payout debit, the duplicate success webhook produced no second debit, provider rejection produced `FAILED`, and a thrown provider/network error produced `RECONCILIATION_REQUIRED` with zero debit. No real provider transfer was run because production and real-money access are intentionally disabled.

## Multi-Ajo Isolation and RBAC

Payment identities are unique per membership/provider and financial records retain membership and cooperative IDs. The database harness created separate Alpha and Beta identities for the same user and confirmed distinct membership mappings. Existing unit tests also confirm that identity resolution does not cross those mappings.

Group routes use authenticated membership and group-role middleware. Group-admin APIs scope reads and writes through the requested cooperative. Member APIs scope obligations, transactions, bank accounts, and payouts through the signed-in user's membership. Platform payout and identity directories are restricted to platform administrators.

The existing test suite covers platform-admin rejection, group membership behavior, invitation constraints, and identity isolation. URL/body tampering and every payout concurrency path were reviewed; full HTTP integration coverage remains a recommended next step.

## Ledger and Database Integrity

`ledger_entries` has MySQL triggers that reject UPDATE and DELETE. Financial foreign keys use RESTRICT where historical records must survive ordinary lifecycle changes. Payment transaction, allocation, webhook, payout, attempt, bank-account, and identity uniqueness constraints support duplicate prevention. The migration set 001-010 recreates the current schema, including payout foreign keys and ledger immutability triggers.

The fresh-schema smoke test and migration runner were previously verified against a disposable database. Running migrations again is idempotent through `schema_migrations` checksums; applied files are skipped rather than edited in place.

## Security Findings and Fixes

Fixed during this audit:

- Removed raw Nomba webhook header/body debug output.
- Changed unknown payment-identity logging to retain only `***` plus the final four account-number digits.
- Provider metadata logging redacts account-number fields.
- Bank account numbers are encrypted and hashed at rest; API projections expose masked values.
- Flutterwave service rejects any mode other than `test`.
- Added the ledger immutability triggers to the fresh `database/schema.sql` path so schema recreation matches migrated databases.
- Production startup now rejects the development JWT fallback, missing `CORS_ORIGIN`, and non-test Flutterwave mode.

Remaining controls:

- A single global rate limiter protects all API routes. It covers sensitive routes, but does not yet provide separate tighter limits for login, provisioning, bank verification, payout creation, or webhook ingress.
- Production startup must explicitly set a non-default `JWT_SECRET`, `NODE_ENV=production`, and `FLUTTERWAVE_MODE=test` until a separately audited production cutover is approved. The current deployment has no production provider enablement.
- Error responses are stable in non-development environments. Development mode intentionally includes diagnostic details and must not be used as a public deployment mode.

## Nomba Cutover Status

Historical Nomba tables, migration history, seed data, services, and documentation were not deleted. The active route index mounts Flutterwave webhooks and does not mount the legacy Nomba webhook/admin routes. The active payment identity provisioning service uses Flutterwave and the active member/cycle payment flow does not use the Nomba account provider.

The repository still contains dead Nomba code and Nomba environment variables. Removing that code is deferred because it would increase migration and historical-data risk; it should be handled as a separately reviewed cleanup after deployment confirms no external dependency remains.

## Test Evidence

### Automated suite

`node --test` passed all 18 tests, including the existing suite and the Phase 3.5 regression tests. Coverage includes:

- allocation math and invalid state transitions;
- partial, multiple, and excess allocation rules;
- payment identity and multi-Ajo resolution;
- webhook parsing and signature rejection;
- payout transfer extraction and encrypted bank-account handling;
- platform/group role checks;
- invitation uniqueness and lifecycle;
- account-number log redaction.

### Disposable database harness

Against a fresh database migrated with 001-010:

- `4,000 + 6,000` against `10,000` produced `PARTIAL` then `PAID` and two credits;
- duplicate `4,000` delivery returned duplicate with transaction count `2`, allocation count `2`, credit count `2`;
- `12,000` against `10,000` produced `EXCESS_PENDING_REVIEW` with `2,000` excess;
- concurrent `6,000 + 6,000` produced `10,000` allocated and `2,000` excess across two allocations;
- wrong `USD` currency was rejected with HTTP-domain status `422` before allocation;
- unknown identity returned no identity and created no financial effect;
- Alpha and Beta payment identities remained mapped to separate memberships.

Fresh `database/schema.sql` recreation produced all 10 audited financial/core tables, the `ledger_entries.payout_id` foreign-key column, and both ledger immutability triggers. A migrated disposable database rejected both direct ledger UPDATE and DELETE attempts.

All 67 frontend JavaScript/JSX files parsed successfully with the installed esbuild parser. The Vite production build could not complete because the local Windows esbuild process failed with `Access is denied` while resolving a directory outside the workspace. Frontend ESLint could not start because the local installation is missing `frontend/node_modules/isexe/index.js`. These are local dependency/tooling failures, not reported application syntax failures. The repository's `npm` launcher was also unavailable in this environment, so the equivalent `node --test` command was used for backend tests.

### Validation limitations

No real Flutterwave transfer, production webhook, live bank verification, or real-money payout was executed. Those tests require provider credentials and an approved sandbox/production operating procedure.

## Remaining Production Blockers

Before production consideration, the project still requires:

1. Approved Flutterwave merchant verification and production credentials/configuration.
2. A separately reviewed production-mode flag and webhook configuration, with HTTPS and domain ownership.
3. Real-money and provider-failure tests in a controlled environment.
4. Database backup, restore, migration rollback, and disaster-recovery validation.
5. Centralized monitoring, alerting, reconciliation operations, and audit-log retention.
6. Secrets management outside committed `.env` files and rotation procedures.
7. Regulatory, legal, and financial-compliance review for stored value, contributions, and payouts.
8. Endpoint-specific abuse limits and HTTP integration tests for cross-Ajo/RBAC tampering and payout concurrency.
9. A business decision for the case where one membership has more than one active cycle obligation; the current query selects the newest active obligation.

## Recommendation

Proceed to a dedicated production-hardening phase only. Do not enable Flutterwave production mode yet. The tested sandbox financial core is suitable for continued controlled testing, but the listed provider, operations, compliance, deployment, and active-cycle policy blockers must be closed and evidenced before any production cutover.
