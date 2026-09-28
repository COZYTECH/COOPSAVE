# Pamoja Rate Limiting

The API uses a lightweight global IP shield plus a separate verified-user limiter for authenticated API traffic. Stricter limiters protect authentication, payment initialization, payout initiation, and bank-account verification. A 429 response is returned as:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

Rate-limit headers are emitted by `express-rate-limit` using the standard `RateLimit` header format. The frontend treats 429 as throttling and does not retry it automatically.

## Proxy configuration

`TRUST_PROXY` must equal the number of trusted proxy hops in front of Express. For the current local ngrok setup, use `TRUST_PROXY=1`. Set it to the actual load-balancer/proxy hop count in production. Do not use `true` unless every proxy in the deployment is trusted and controlled.

## Redis

With no `REDIS_URL`, the app uses the bounded process-local store supplied by `express-rate-limit`, which is suitable for local development and single-process tests. The health response exposes the current store status.

For multiple API instances, install the optional shared-store packages in the deployment image and configure `REDIS_URL`:

```bash
npm install redis rate-limit-redis
```

When those packages and `REDIS_URL` are present, the limiter uses Redis counters shared by all API instances. If Redis is configured but unavailable, the service reports that state in `/health` and logs the failure; investigate Redis before scaling the API horizontally.

The default global shield is 300 requests per IP per minute. Authenticated routes then receive an independent 120 requests per verified user per minute quota. Financial endpoint limits remain independent of both.

Flutterwave webhook routes are intentionally excluded from ordinary global/user/IP quotas. They retain signature verification, bounded body parsing, and event idempotency so legitimate provider retries are not rejected by a user limiter.
