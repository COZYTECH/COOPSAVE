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
npm run db:schema
npm run db:migrate
```

4. Start the API:

```bash
npm run dev
```

For production:

```bash
npm start
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

## Nomba Integration

Nomba credentials and endpoint paths are loaded from environment variables. Set these before using `src/services/nomba.service.js`:

```bash
NOMBA_BASE_URL=
NOMBA_ACCOUNT_ID=
NOMBA_CLIENT_ID=
NOMBA_CLIENT_SECRET=
NOMBA_WEBHOOK_SECRET=
```

The integration currently exposes reusable provider methods only; it is not connected to CoopSave business workflows yet.

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
- `POST /api/webhooks/nomba` - ingest Nomba webhooks into `webhook_events`
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

Nomba webhook ingestion:

```http
POST /api/webhooks/nomba
Content-Type: application/json
nomba-signature: <signature>
```

Valid Nomba webhook deliveries are verified, validated, deduplicated by
`event_id` or `transaction_reference`, and stored in `webhook_events`.
`payment_success` events are delegated to `PaymentProcessingService`, which
creates the transaction, updates the member contribution balance, and emits
`payment.received` after commit. Reconciliation is not performed by this
endpoint.

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
