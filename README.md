# CoopSave Backend

Backend foundation for CoopSave using Node.js, Express.js, MySQL, JWT, bcryptjs, mysql2, dotenv, cors, helmet, express-rate-limit, and express-validator.

The repository also includes a React/Vite admin frontend in `frontend/`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Create the database tables and apply migrations:

```bash
npm run migrate
```

The migration runner reads either `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`
or a Railway-style `DATABASE_URL` / `MYSQL_URL`.

4. Start the API:

```bash
npm run dev
```

For production:

```bash
npm run migrate
npm start
```

On Railway, set your MySQL connection environment variables, then run:

```bash
npm run migrate
```

Rollback support is available for the most recently applied migration:

```bash
npm run migrate:rollback
```

## Frontend Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Create the frontend environment file:

```bash
cp .env.example .env
```

3. Start the frontend:

```bash
npm run dev
```

The frontend expects the backend API at `VITE_API_BASE_URL`, which defaults to `http://localhost:5000/api`.
Realtime payment updates use Socket.IO at `VITE_SOCKET_URL`, which defaults to `http://localhost:5000`.

First-time users should open `/register` to create an owner account, then sign in at `/login`.

## Flutterwave Phase 1

Flutterwave is the active provider boundary for new payment identities. Phase 1
is test-mode only and keeps the secret key on the backend:

```bash
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
FLUTTERWAVE_MODE=test
FLUTTERWAVE_TRANSFERS_PATH=/transfers
FLUTTERWAVE_BANKS_PATH=/banks
FLUTTERWAVE_RESOLVE_ACCOUNT_PATH=/accounts/resolve
PAYOUT_BANK_ENCRYPTION_KEY=<long-random-secret>
```

New payment identities belong to `cooperative_memberships`, not the legacy
`members` table. See `docs/PAYMENT_IDENTITY_PHASE1.md` for the lifecycle,
webhook behavior, and provider model. Existing Nomba records remain historical;
Nomba sync and webhook routes are no longer registered.

## Endpoints

- `GET /health` - service health check
- `POST /api/cooperatives` - create a cooperative
- `GET /api/cooperatives` - list cooperatives owned by the current user
- `GET /api/cooperatives/:id` - get an owned cooperative
- `PUT /api/cooperatives/:id` - update an owned cooperative
- `DELETE /api/cooperatives/:id` - delete an owned cooperative
- `POST /api/members` - create a member in an owned cooperative
- `GET /api/members` - list members across cooperatives owned by the current user
- `GET /api/members/:id` - get a member from an owned cooperative
- `PUT /api/members/:id` - update a member from an owned cooperative
- `DELETE /api/members/:id` - delete a member from an owned cooperative
- `POST /api/webhooks/flutterwave` - verify and persist Flutterwave webhook events
- `GET /api/groups/:groupId/payment-identity` - view the current user's Ajo-scoped payment identity
- `POST /api/groups/:groupId/payment-identity/provision` - retry the current user's failed identity provisioning
- `GET /api/groups/:groupId/manage/payment-identities` - group-admin view of identities in one Ajo
- `GET /api/groups/:groupId/cycles` - list cycles visible to an Ajo member
- `POST /api/groups/:groupId/cycles` - create a draft cycle as a group admin
- `POST /api/groups/:groupId/cycles/:cycleId/start` - create obligations and activate a cycle
- `GET /api/groups/:groupId/obligations` - group-admin obligation view
- `GET /api/groups/:groupId/transactions` - group-admin normalized payment transactions
- `GET /api/me/ajo-contributions/:groupId` - member-scoped obligations
- `GET /api/me/ajo-contributions/:groupId/transactions` - member-scoped payment transactions
- `GET /api/admin/payment-identities` - platform-admin identity directory
- `GET /api/admin/payment-transactions` - platform-admin normalized transaction directory
- `GET /api/admin/payouts` - platform-admin payout directory
- `GET /api/banks?country=NG` - Flutterwave test-mode bank directory
- `POST /api/groups/:groupId/bank-accounts/verify` - verify a recipient bank account
- `GET /api/groups/:groupId/cycles/:cycleId/payout-eligibility` - evaluate payout eligibility
- `POST /api/groups/:groupId/cycles/:cycleId/payouts` - initiate an eligible test payout
- `GET /api/groups/:groupId/payouts` - group payout directory
- `GET /api/me/ajo-payouts/:groupId` - member payout history
- `GET /api/reconciliation` - return matched, missing, and failed transaction buckets
- `POST /api/v1/auth/register` - register a user
- `POST /api/v1/auth/login` - log in a user
- `GET /api/v1/auth/me` - get the current authenticated user

The app also keeps the existing `/api/v1` route prefix available, so the cooperative and member routes work under `/api/v1/cooperatives` and `/api/v1/members` too.

## Request Examples

Register:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "Password123!"
}
```

Login:

```json
{
  "email": "ada@example.com",
  "password": "Password123!"
}
```

Authenticated requests should include:

```http
Authorization: Bearer <token>
```

Flutterwave webhook ingestion:

```http
POST /api/webhooks/flutterwave
Content-Type: application/json
verif-hash: <configured_flutterwave_webhook_secret>
```

Valid Flutterwave deliveries are verified, validated, deduplicated by
`event_id` or transaction reference, and persisted before the endpoint returns.
Known payment identities are resolved only through provider account/reference
fields. Verified payments are allocated atomically to the identity's active
cycle obligation and recorded in the append-only ledger. Unknown payments and
payments without an active obligation are marked `RECONCILIATION_REQUIRED`;
this phase does not implement payouts or refunds.

Create cooperative:

```json
{
  "name": "Main Street Cooperative",
  "description": "Savings group for Main Street members"
}
```

Create member:

```json
{
  "cooperative_id": 1,
  "full_name": "Grace Hopper",
  "email": "grace@example.com",
  "phone": "+2348012345678"
}
```
