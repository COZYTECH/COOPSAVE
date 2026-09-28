const assert = require('node:assert/strict');
const test = require('node:test');

const previousEncryptionKey = process.env.PAYOUT_BANK_ENCRYPTION_KEY;
process.env.PAYOUT_BANK_ENCRYPTION_KEY = 'phase-three-test-encryption-key';

const flutterwaveWebhookService = require('../src/services/flutterwaveWebhookService');
const { encryptAccountNumber, decryptAccountNumber, hashAccountNumber, maskAccountNumber } = require('../src/utils/bankAccountCrypto');

test('transfer webhook extraction keeps provider identifiers and status', () => {
  const event = flutterwaveWebhookService.extractEvent({
    event: 'transfer.completed',
    data: {
      id: 987,
      reference: 'PAYOUT-AJO-1-CYCLE-2-MEMBER-3-ATTEMPT-1',
      status: 'SUCCESSFUL',
      amount: 125000,
      currency: 'NGN',
      account_bank: '044'
    }
  });

  assert.equal(event.eventType, 'transfer.completed');
  assert.equal(event.transferId, '987');
  assert.equal(event.transferReference, 'PAYOUT-AJO-1-CYCLE-2-MEMBER-3-ATTEMPT-1');
  assert.equal(event.transferStatus, 'SUCCESSFUL');
  assert.equal(event.recipientBankCode, '044');
});

test('recipient account numbers are encrypted, hashed, and masked', () => {
  const accountNumber = '0123456789';
  const encrypted = encryptAccountNumber(accountNumber);

  assert.equal(decryptAccountNumber(encrypted), accountNumber);
  assert.equal(hashAccountNumber(accountNumber).length, 64);
  assert.equal(maskAccountNumber(accountNumber), '******6789');
  assert.equal(encrypted.includes(accountNumber), false);
});

test.after(() => {
  if (previousEncryptionKey === undefined) {
    delete process.env.PAYOUT_BANK_ENCRYPTION_KEY;
  } else {
    process.env.PAYOUT_BANK_ENCRYPTION_KEY = previousEncryptionKey;
  }
});
