const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const express = require('express');
const { createLimiter } = require('../src/middleware/rateLimitMiddleware');

const request = (server, { headers = {} } = {}) => new Promise((resolve, reject) => {
  const address = server.address();
  const req = http.request({ hostname: '127.0.0.1', port: address.port, path: '/', headers }, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
  });
  req.on('error', reject);
  req.end();
});

const start = (middleware, setup = () => {}) => new Promise((resolve) => {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    setup(req);
    next();
  });
  app.use(middleware);
  app.get('/', (req, res) => res.json({ success: true }));
  const server = app.listen(0, () => resolve(server));
});

test('rate limits return the standard JSON shape and headers', async () => {
  const server = await start(createLimiter({ category: 'test', windowMs: 60_000, max: 1 }));
  try {
    const first = await request(server, { headers: { 'x-forwarded-for': '198.51.100.10' } });
    const second = await request(server, { headers: { 'x-forwarded-for': '198.51.100.10' } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
    assert.equal(second.body.success, false);
    assert.equal(second.body.code, 'RATE_LIMIT_EXCEEDED');
    assert.match(String(second.headers['ratelimit']), /limit=1/i);
  } finally {
    server.close();
  }
});

test('authenticated limiter keys verified user identity, not a client-supplied user header', async () => {
  const limiter = createLimiter({ category: 'test_user', windowMs: 60_000, max: 1, authenticated: true });
  const server = await start(limiter, (req) => {
    req.user = { id: req.headers['x-test-authenticated-user'] || 'server-user' };
  });
  try {
    const first = await request(server, { headers: { 'x-test-authenticated-user': 'user-a', 'x-user-id': 'spoofed' } });
    const second = await request(server, { headers: { 'x-test-authenticated-user': 'user-a', 'x-user-id': 'different' } });
    const other = await request(server, { headers: { 'x-test-authenticated-user': 'user-b', 'x-user-id': 'spoofed' } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
    assert.equal(other.status, 200);
  } finally {
    server.close();
  }
});
