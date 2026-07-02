# Nomba Testing Guide

This guide explains how CoopSave integrates with Nomba, how to test the sandbox virtual account flow, and how to diagnose common issues. It is written for contributors working on the Express.js, MySQL, and React/Vite codebase.

## 1. Project Architecture

CoopSave follows a layered service-repository architecture:

```text
Frontend
  ↓
Express
  ↓
Controller
  ↓
Service
  ↓
NombaService
  ↓
Nomba API
```

Important backend layers:

- Controllers accept HTTP requests and return responses.
- Services own business workflows.
- Repositories perform database-only operations.
- `NombaService` owns outbound Nomba HTTP calls.
- `VirtualAccountProvider` selects sandbox or production account allocation.
- `SandboxVirtualAccountProvider` reserves accounts from the local `virtual_accounts` pool.

Member creation flow:

```text
POST /api/members
  ↓
memberController.createMember
  ↓
memberService.createMember
  ↓
virtualAccountProvider.allocateAccount
  ↓
sandboxVirtualAccountProvider.allocateAccount
  ↓
virtualAccountRepository.findAvailableForUpdate
  ↓
MySQL virtual_accounts resource pool
```

Virtual account sync flow:

```text
POST /api/admin/nomba/sync
  ↓
nombaAdminController.syncVirtualAccounts
  ↓
virtualAccountSyncService.syncSandboxVirtualAccounts
  ↓
nombaService.listVirtualAccounts
  ↓
POST /v1/accounts/virtual/list
  ↓
virtualAccountRepository.create
```

Key files:

- `src/config/nomba.js`
- `src/services/nomba.service.js`
- `src/services/virtualAccountSyncService.js`
- `src/services/virtualAccountProvider.js`
- `src/services/providers/sandboxVirtualAccountProvider.js`
- `src/repositories/virtualAccountRepository.js`
- `src/services/nombaWebhookIngestionService.js`
- `src/repositories/webhookEventRepository.js`

## 2. Authentication

### CoopSave JWT

Protected backend routes require a CoopSave JWT:

```http
Authorization: Bearer <jwt>
```

Get a JWT by logging in:

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "admin@example.com",
  "password": "Password123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "member",
      "isActive": true
    },
    "token": "<jwt>"
  }
}
```

### Nomba Access Token

Nomba authentication is handled by `src/services/nomba.service.js`.

Required environment variables:

```env
NOMBA_BASE_URL=https://api.nomba.com/v1
NOMBA_ACCOUNT_ID=
NOMBA_CLIENT_ID=
NOMBA_CLIENT_SECRET=
NOMBA_AUTH_PATH=/auth/token/issue
```

Project function:

```js
authenticate()
```

HTTP method:

```http
POST
```

Full URL:

```text
${NOMBA_BASE_URL}${NOMBA_AUTH_PATH}
```

Default:

```text
https://api.nomba.com/v1/auth/token/issue
```

Required headers:

```http
Accept: application/json
Content-Type: application/json
```

Required body:

```json
{
  "accountId": "<NOMBA_ACCOUNT_ID>",
  "client_id": "<NOMBA_CLIENT_ID>",
  "client_secret": "<NOMBA_CLIENT_SECRET>",
  "grant_type": "client_credentials"
}
```

Sample response:

```json
{
  "access_token": "<nomba_access_token>",
  "expires_in": 3600
}
```

Nomba API requests use:

```http
Authorization: Bearer <nomba_access_token>
accountId: <NOMBA_ACCOUNT_ID>
```

## 3. Implemented Nomba Endpoints

### Authenticate

Purpose:

Obtain and cache a Nomba access token.

HTTP method:

```http
POST
```

Full URL:

```text
${NOMBA_BASE_URL}${NOMBA_AUTH_PATH}
```

Required headers:

```http
Accept: application/json
Content-Type: application/json
```

Required body:

```json
{
  "accountId": "<NOMBA_ACCOUNT_ID>",
  "client_id": "<NOMBA_CLIENT_ID>",
  "client_secret": "<NOMBA_CLIENT_SECRET>",
  "grant_type": "client_credentials"
}
```

Sample response:

```json
{
  "access_token": "<token>",
  "expires_in": 3600
}
```

Project function:

```js
authenticate()
```

### List Virtual Accounts

Purpose:

Fetch sandbox virtual accounts from Nomba for import into the local `virtual_accounts` resource pool.

HTTP method:

```http
POST
```

Full URL:

```text
${NOMBA_BASE_URL}/accounts/virtual/list
```

Default:

```text
https://api.nomba.com/v1/accounts/virtual/list
```

Required headers:

```http
Authorization: Bearer <nomba_access_token>
accountId: <NOMBA_ACCOUNT_ID>
Accept: application/json
Content-Type: application/json
```

Required body:

The current implementation sends an empty object by default:

```json
{}
```

Sample response:

```json
{
  "data": [
    {
      "accountRef": "SANDBOX-001",
      "accountNumber": "1234567890",
      "accountName": "Sandbox Account 1",
      "bankName": "Nomba Bank"
    }
  ]
}
```

Project function:

```js
listVirtualAccounts(payload)
```

### Create Virtual Account

Purpose:

Create a virtual account through Nomba. This helper exists, but production allocation is not implemented yet. Sandbox allocation currently uses the local `virtual_accounts` pool.

HTTP method:

```http
POST
```

Full URL:

```text
${NOMBA_BASE_URL}${NOMBA_VIRTUAL_ACCOUNTS_PATH}
```

Required headers:

```http
Authorization: Bearer <nomba_access_token>
accountId: <NOMBA_ACCOUNT_ID>
Accept: application/json
Content-Type: application/json
```

Required body:

Provider-defined payload from the caller.

Sample response:

```json
{
  "data": {
    "accountRef": "COOPSAVE-001",
    "accountNumber": "1234567890",
    "accountName": "Ada Lovelace"
  }
}
```

Project function:

```js
createVirtualAccount(payload)
```

### Get Virtual Account

Purpose:

Fetch one Nomba virtual account.

HTTP method:

```http
GET
```

Full URL:

```text
${NOMBA_BASE_URL}${NOMBA_VIRTUAL_ACCOUNTS_PATH}/{virtualAccountId}
```

Required headers:

```http
Authorization: Bearer <nomba_access_token>
accountId: <NOMBA_ACCOUNT_ID>
Accept: application/json
```

Required body:

None.

Sample response:

```json
{
  "data": {
    "accountRef": "COOPSAVE-001",
    "accountNumber": "1234567890",
    "accountName": "Ada Lovelace"
  }
}
```

Project function:

```js
getVirtualAccount(virtualAccountId, params)
```

### Get Transactions

Purpose:

Fetch transaction records from Nomba.

HTTP method:

```http
GET
```

Full URL:

```text
${NOMBA_BASE_URL}${NOMBA_TRANSACTIONS_PATH}
```

Required headers:

```http
Authorization: Bearer <nomba_access_token>
accountId: <NOMBA_ACCOUNT_ID>
Accept: application/json
```

Required body:

None.

Sample response:

```json
{
  "data": [
    {
      "transactionId": "txn_001",
      "amount": 5000,
      "status": "success"
    }
  ]
}
```

Project function:

```js
getTransactions(params)
```

### Verify Webhook Signature

Purpose:

Validate incoming Nomba webhook payload signatures.

HTTP method:

Not an outbound Nomba endpoint.

Required headers:

```http
nomba-signature: <signature>
```

Required body:

Raw JSON webhook payload.

Sample result:

```js
true
```

Project function:

```js
verifyWebhookSignature(payload, signature)
```

## 4. Internal Routes

### POST `/api/admin/nomba/sync`

Purpose:

Synchronize Nomba sandbox virtual accounts into the local `virtual_accounts` resource pool.

Authentication:

```http
Authorization: Bearer <jwt>
```

Request body:

None.

Expected response:

```json
{
  "imported": 2,
  "skipped": 4,
  "total": 6
}
```

Database behavior:

- If `account_ref` already exists, the account is skipped.
- If `account_ref` does not exist, the account is inserted with:
  - `status = 'AVAILABLE'`
  - `environment = 'SANDBOX'`
  - `provider = 'NOMBA'`
  - `member_id = NULL`

Project functions:

```js
virtualAccountSyncService.syncSandboxVirtualAccounts()
nombaService.listVirtualAccounts()
virtualAccountRepository.findByAccountRef()
virtualAccountRepository.create()
```

### POST `/api/webhooks/nomba`

Purpose:

Receive Nomba webhooks, verify `nomba-signature`, validate the payload shape, prevent duplicate ingestion, and persist the raw payload in `webhook_events` with `processing_status = PENDING`.

This endpoint is ingestion-only. It does not create transactions, update contributions, run reconciliation, or emit payment events.

Authentication:

No CoopSave JWT. Authenticity is checked with Nomba webhook signature verification.

Required headers:

```http
Content-Type: application/json
nomba-signature: <signature>
```

Expected response:

```json
{
  "success": true,
  "message": "Webhook received.",
  "data": {
    "received": true,
    "duplicate": false,
    "eventId": 1
  }
}
```

### GET `/api/reconciliation`

Purpose:

Return matched, missing, and failed transaction buckets for the authenticated owner.

Authentication:

```http
Authorization: Bearer <jwt>
```

Expected response:

```json
{
  "success": true,
  "message": "Reconciliation data retrieved.",
  "data": {
    "summary": {
      "matchedCount": 1,
      "missingCount": 0,
      "failedCount": 0,
      "totalMatched": 5000
    },
    "matched_transactions": [],
    "missing_transactions": [],
    "failed_transactions": []
  }
}
```

### POST `/api/members`

Purpose:

Create a member and allocate a virtual account from the local resource pool.

Authentication:

```http
Authorization: Bearer <jwt>
```

Required body:

```json
{
  "cooperative_id": 1,
  "full_name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone": "+2348012345678"
}
```

Expected response:

```json
{
  "success": true,
  "message": "Member created.",
  "data": {
    "member": {
      "id": 1,
      "cooperativeId": 1,
      "fullName": "Ada Lovelace",
      "email": "ada@example.com",
      "phone": "+2348012345678",
      "accountRef": "SANDBOX-001",
      "accountNumber": "1234567890",
      "accountName": "Sandbox Account 1"
    }
  }
}
```

## 5. Testing Guide

### Step 1: Confirm Environment Variables

```env
DB_NAME=coopsave
NOMBA_BASE_URL=https://api.nomba.com/v1
NOMBA_ACCOUNT_ID=
NOMBA_CLIENT_ID=
NOMBA_CLIENT_SECRET=
NOMBA_WEBHOOK_SECRET=
NOMBA_ENV=sandbox
```

Optional override for the list endpoint:

```env
NOMBA_VIRTUAL_ACCOUNTS_LIST_PATH=/accounts/virtual/list
```

### Step 2: Apply Database Schema and Migration

```bash
npm run db:schema
npm run db:migrate
```

### Step 3: Obtain a CoopSave JWT

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "Password123"
}
```

Copy `data.token`.

### Step 4: Obtain a Nomba Token

This is normally handled internally by `NombaService`. If testing directly, call:

```js
authenticate()
```

Expected result:

```json
{
  "access_token": "<token>",
  "expires_in": 3600
}
```

### Step 5: Sync Virtual Accounts

```http
POST http://localhost:5000/api/admin/nomba/sync
Authorization: Bearer <jwt>
Content-Type: application/json
```

Expected response:

```json
{
  "imported": 2,
  "skipped": 4,
  "total": 6
}
```

Expected logs:

```json
{"level":"info","event":"nomba.virtual_accounts.sync.started","provider":"nomba"}
{"level":"info","event":"nomba.virtual_accounts.sync.imported","provider":"nomba","accountRef":"SANDBOX-001"}
{"level":"info","event":"nomba.virtual_accounts.sync.skipped","provider":"nomba","accountRef":"SANDBOX-002"}
{"level":"info","event":"nomba.virtual_accounts.sync.finished","provider":"nomba","imported":2,"skipped":4,"total":6}
```

### Step 6: View Imported Accounts

```sql
SELECT
  id,
  member_id,
  account_ref,
  account_number,
  account_name,
  provider,
  environment,
  status,
  reserved_at,
  assigned_at
FROM virtual_accounts
ORDER BY id ASC;
```

Expected before allocation:

```text
AVAILABLE
```

### Step 7: Create a Cooperative

```http
POST http://localhost:5000/api/cooperatives
Authorization: Bearer <jwt>
Content-Type: application/json
```

Body:

```json
{
  "name": "Main Street Cooperative",
  "description": "Savings group"
}
```

### Step 8: Create a Member

```http
POST http://localhost:5000/api/members
Authorization: Bearer <jwt>
Content-Type: application/json
```

Body:

```json
{
  "cooperative_id": 1,
  "full_name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone": "+2348012345678"
}
```

`MemberService` owns the business transaction:

```text
BEGIN
  SELECT first AVAILABLE virtual account FOR UPDATE
  status = RESERVED
  create member
  status = ASSIGNED
  member_id = created member id
  assigned_at = NOW()
COMMIT
```

### Step 9: Verify Allocation

Check member:

```sql
SELECT id, full_name, account_ref, account_number, account_name
FROM members
WHERE email = 'ada@example.com';
```

Check virtual account:

```sql
SELECT id, member_id, account_ref, status, reserved_at, assigned_at
FROM virtual_accounts
WHERE account_ref = 'SANDBOX-001';
```

Expected transition:

```text
AVAILABLE
  ↓
RESERVED
  ↓
ASSIGNED
```

The final committed state should be:

```text
ASSIGNED
```

### Step 10: Test Webhook Ingestion

```http
POST http://localhost:5000/api/webhooks/nomba
Content-Type: application/json
nomba-signature: <signature>
```

Expected database changes:

- `webhook_events` receives one row.
- `processing_status` is `PENDING`.
- Duplicate deliveries with the same `event_id` or `transaction_reference` return `200 OK` and do not create another row.
- No `transactions`, `contributions`, or reconciliation rows are changed in this phase.

Check MySQL:

```sql
SELECT
  id,
  provider,
  event_type,
  event_id,
  account_ref,
  transaction_reference,
  processing_status,
  received_at
FROM webhook_events
ORDER BY received_at DESC;
```

## 6. Troubleshooting

### JWT Mismatch

Symptoms:

- Protected routes return `401`.
- Frontend redirects to login.

Diagnosis:

- Confirm `Authorization: Bearer <jwt>` is present.
- Confirm `JWT_SECRET` did not change after the token was issued.

Fix:

- Restart backend.
- Clear browser localStorage.
- Log in again.

### Nomba `401`

Symptoms:

- Nomba requests fail with unauthorized.
- Logs show `nomba.request.failed` with `status: 401`.

Diagnosis:

- Check `NOMBA_CLIENT_ID`.
- Check `NOMBA_CLIENT_SECRET`.
- Check `NOMBA_ACCOUNT_ID`.
- Confirm `NOMBA_BASE_URL`.

Fix:

- Correct `.env`.
- Restart backend.
- Retry sync.

### Nomba or Backend `403`

Symptoms:

- Nomba rejects requests despite a token.
- Frontend requests are blocked by CORS.

Diagnosis:

- For Nomba, confirm account and environment permissions.
- For backend CORS, confirm `CORS_ORIGIN` includes the frontend origin.

Fix:

- Correct Nomba account settings.
- Update `CORS_ORIGIN`.
- Restart backend.

### Empty `virtual_accounts` Table

Symptoms:

- Member creation fails with `No sandbox virtual accounts available.`

Diagnosis:

```sql
SELECT COUNT(*) FROM virtual_accounts;
SELECT status, COUNT(*) FROM virtual_accounts GROUP BY status;
```

Fix:

- Run `POST /api/admin/nomba/sync`.
- Confirm Nomba returns accounts.
- Confirm imported accounts have `status = 'AVAILABLE'`.

### Duplicate Account

Symptoms:

- MySQL duplicate key error for `account_ref` or `account_number`.

Diagnosis:

```sql
SELECT account_ref, COUNT(*)
FROM virtual_accounts
GROUP BY account_ref
HAVING COUNT(*) > 1;
```

Fix:

- The sync service skips existing `account_ref` values.
- If duplicates exist from manual inserts, clean the data carefully before syncing again.

### No Sandbox Accounts

Symptoms:

- `AppError: No sandbox virtual accounts available.`

Diagnosis:

```sql
SELECT id, account_ref, environment, status
FROM virtual_accounts
WHERE environment = 'SANDBOX'
ORDER BY id ASC;
```

Fix:

- Run the sync route.
- Ensure at least one sandbox account is `AVAILABLE`.

### Account Stuck in `RESERVED`

Symptoms:

- A failed member creation leaves an account reserved.

Diagnosis:

```sql
SELECT id, account_ref, status, reserved_at
FROM virtual_accounts
WHERE status = 'RESERVED';
```

Expected behavior:

`MemberService` rolls back and attempts to release reserved accounts on failure.

Fix:

Check backend logs. Manually release only confirmed stale reservations:

```sql
UPDATE virtual_accounts
SET
  status = 'AVAILABLE',
  member_id = NULL,
  reserved_at = NULL,
  assigned_at = NULL
WHERE id = <virtual_account_id>;
```

### Sync Imports Zero Accounts

Symptoms:

`POST /api/admin/nomba/sync` returns:

```json
{
  "imported": 0,
  "skipped": 0,
  "total": 0
}
```

Diagnosis:

- Confirm the Nomba list endpoint path is correct.
- Confirm the response shape contains one of the supported account arrays:
  - `accounts`
  - `virtualAccounts`
  - `virtual_accounts`
  - `data.accounts`
  - `data.virtualAccounts`
  - `data.virtual_accounts`
  - `data.items`
  - `data.content`
  - `data`

Fix:

- Set `NOMBA_VIRTUAL_ACCOUNTS_LIST_PATH=/accounts/virtual/list`.
- Inspect Nomba logs from `src/config/nomba.js`.
- Update normalization only if Nomba returns a new response shape.

### Webhook Signature Failure

Symptoms:

- `POST /api/webhooks/nomba` returns `401`.

Diagnosis:

- Confirm `NOMBA_WEBHOOK_SECRET`.
- Confirm the raw JSON payload is what was signed.
- Confirm the signature header is `nomba-signature`.

Fix:

- Correct webhook secret.
- Restart backend.
- Re-send webhook with the correct signature.

## Contributor Notes

- Keep Nomba HTTP calls in `nomba.service.js`.
- Keep database-only logic in repositories.
- Keep virtual account sync in `virtualAccountSyncService`.
- Keep member creation transaction ownership in `memberService.createMember()`.
- Do not add Nomba business logic directly to controllers.
- Sandbox allocation uses the local `virtual_accounts` resource pool.
- Production allocation is intentionally not implemented yet.
