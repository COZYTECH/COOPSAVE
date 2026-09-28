const crypto = require('crypto');
const env = require('../config/env');

const getKey = () => {
  if (!env.payout.bankEncryptionKey) {
    throw new Error('PAYOUT_BANK_ENCRYPTION_KEY is not configured.');
  }
  return crypto.createHash('sha256').update(env.payout.bankEncryptionKey).digest();
};

const normalizeAccountNumber = (accountNumber) => String(accountNumber || '').replace(/\s+/g, '');

const hashAccountNumber = (accountNumber) => crypto
  .createHmac('sha256', getKey())
  .update(normalizeAccountNumber(accountNumber))
  .digest('hex');

const maskAccountNumber = (accountNumber) => {
  const normalized = normalizeAccountNumber(accountNumber);
  return normalized.length <= 4
    ? '*'.repeat(normalized.length)
    : `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
};

const encryptAccountNumber = (accountNumber) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizeAccountNumber(accountNumber), 'utf8'),
    cipher.final()
  ]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url')
  ].join(':');
};

const decryptAccountNumber = (value) => {
  const [version, ivValue, tagValue, encryptedValue] = String(value || '').split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Encrypted bank account data is invalid.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
};

module.exports = {
  normalizeAccountNumber,
  hashAccountNumber,
  maskAccountNumber,
  encryptAccountNumber,
  decryptAccountNumber
};
