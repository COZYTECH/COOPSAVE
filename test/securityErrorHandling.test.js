const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const apiResponse = require('../src/utils/apiResponse');
const AppError = require('../src/utils/appError');
const errorHandler = require('../src/middleware/errorHandler');

const buildResponse = () => ({
  statusCode: null,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  }
});

const buildRequest = () => ({
  requestId: 'request-security-test',
  method: 'POST',
  originalUrl: '/api/test',
  user: null
});

const runErrorHandler = (error) => {
  const response = buildResponse();
  const previousError = console.error;
  const logs = [];
  console.error = (value) => logs.push(String(value));

  try {
    errorHandler(error, buildRequest(), response, () => {});
  } finally {
    console.error = previousError;
  }

  return { response, logs: logs.join('\n') };
};

test('unexpected errors return a safe response and retain diagnostics only in logs', () => {
  const error = new Error('SQL password=internal-only');
  const { response, logs } = runErrorHandler(error);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.payload, {
    success: false,
    message: 'Something went wrong. Please try again.',
    code: 'INTERNAL_ERROR',
    requestId: 'request-security-test'
  });
  assert.match(logs, /SQL password=internal-only/);
  assert.match(logs, /request-security-test/);
  assert.equal('stack' in response.payload, false);
  assert.equal('details' in response.payload, false);
});

test('database errors do not expose SQL internals or driver codes to clients', () => {
  const error = new Error('Unknown column payment_secret in query');
  error.code = 'ER_BAD_FIELD_ERROR';
  error.sqlMessage = 'Unknown column payment_secret in query';
  error.sql = 'SELECT payment_secret FROM users';

  const { response } = runErrorHandler(error);

  assert.equal(response.statusCode, 500);
  assert.equal(response.payload.code, 'INTERNAL_ERROR');
  assert.equal(response.payload.message, 'Something went wrong. Please try again.');
  assert.equal(JSON.stringify(response.payload).includes('ER_BAD_FIELD_ERROR'), false);
  assert.equal(JSON.stringify(response.payload).includes('payment_secret'), false);
});

test('provider errors return a safe message while sensitive diagnostics stay server-side', () => {
  const error = new Error('Request failed with status code 400');
  error.code = 'ERR_BAD_REQUEST';
  error.response = {
    status: 400,
    data: {
      message: 'Provider raw error',
      authorization: 'Bearer provider-secret',
      account_number: '1234567890'
    }
  };

  const { response, logs } = runErrorHandler(error);

  assert.equal(response.statusCode, 500);
  assert.equal(response.payload.message, 'Something went wrong. Please try again.');
  assert.equal(JSON.stringify(response.payload).includes('Provider raw error'), false);
  assert.equal(JSON.stringify(response.payload).includes('provider-secret'), false);
  assert.equal(JSON.stringify(response.payload).includes('1234567890'), false);
  assert.equal(logs.includes('provider-secret'), false);
  assert.equal(logs.includes('1234567890'), false);
});

test('safe operational errors preserve the application contract and request ID', () => {
  const error = new AppError(
    'We could not initialize your payment. Please try again.',
    502,
    null,
    'PAYMENT_INITIALIZATION_FAILED'
  );
  const { response } = runErrorHandler(error);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.payload, {
    success: false,
    message: 'We could not reach the payment provider. Please try again.',
    code: 'PAYMENT_INITIALIZATION_FAILED',
    requestId: 'request-security-test'
  });
});

test('validation details remain limited to safe field messages', () => {
  const error = new AppError('Validation failed.', 422, [
    { field: 'currency', message: 'Currency must be a three-letter code.' }
  ]);
  const { response } = runErrorHandler(error);

  assert.deepEqual(response.payload, {
    success: false,
    message: 'Validation failed.',
    errors: [{ field: 'currency', message: 'Currency must be a three-letter code.' }],
    code: 'VALIDATION_ERROR',
    requestId: 'request-security-test'
  });
});

test('frontend API errors never fall back to raw Axios exception messages', () => {
  const source = fs.readFileSync('frontend/src/lib/api.js', 'utf8');
  const getApiErrorBody = source.slice(source.indexOf('export const getApiError'));

  assert.equal(getApiErrorBody.includes('error.message ||'), false);
  assert.equal(getApiErrorBody.includes('error.response?.data?.message'), false);
  assert.match(getApiErrorBody, /return fallback;/);
});

test('api response helper supports safe error codes and request IDs', () => {
  const response = buildResponse();
  apiResponse.error(response, 503, 'Service unavailable.', null, {
    code: 'SERVICE_UNAVAILABLE',
    requestId: 'request-helper-test'
  });

  assert.deepEqual(response.payload, {
    success: false,
    message: 'Service unavailable.',
    code: 'SERVICE_UNAVAILABLE',
    requestId: 'request-helper-test'
  });
});
