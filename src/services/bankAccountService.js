const { pool } = require('../config/database');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const verifiedBankAccountRepository = require('../repositories/verifiedBankAccountRepository');
const flutterwaveService = require('./flutterwave.service');
const { logFlutterwaveEvent } = require('../config/flutterwave');
const AppError = require('../utils/appError');
const env = require('../config/env');
const {
  normalizeAccountNumber,
  hashAccountNumber,
  maskAccountNumber,
  encryptAccountNumber
} = require('../utils/bankAccountCrypto');

const PROVIDER = 'FLUTTERWAVE';

const safeAccount = (account) => account && ({
  id: account.id,
  membershipId: account.membership_id,
  country: account.country,
  currency: account.currency,
  bankCode: account.bank_code,
  bankName: account.bank_name,
  accountNumberMasked: account.account_number_masked,
  accountName: account.account_name,
  provider: account.provider,
  providerAccountReference: account.provider_account_reference,
  verificationStatus: account.verification_status,
  verificationMetadata: account.verification_metadata,
  verifiedAt: account.verified_at,
  createdAt: account.created_at,
  updatedAt: account.updated_at
});

const getMembership = async (userId, cooperativeId) => {
  const membership = await groupMembershipRepository.findByUserAndCooperative(userId, cooperativeId);
  if (!membership) {
    throw new AppError('Cooperative membership not found.', 404);
  }
  return membership;
};

const listBanks = async (country = env.payout.country) => {
  let response;
  try {
    response = await flutterwaveService.listBanks(country);
  } catch (error) {
    logFlutterwaveEvent('error', 'flutterwave.bank_directory.failed', {
      country,
      code: error.code || null,
      message: error.message
    });
    throw new AppError(
      'Unable to retrieve banks right now. Please try again.',
      503,
      null,
      'BANK_DIRECTORY_UNAVAILABLE'
    );
  }
  const banks = Array.isArray(response?.data) ? response.data : [];
  return banks.map((bank) => ({
    code: String(bank.code || bank.id || ''),
    name: bank.name || bank.bank_name || '',
    hasBranches: Boolean(bank.has_branches)
  })).filter((bank) => bank.code && bank.name);
};

const listForUser = async ({ userId, cooperativeId }) => {
  const membership = await getMembership(userId, cooperativeId);
  return (await verifiedBankAccountRepository.findByMembershipId(membership.id)).map(safeAccount);
};

const verifyForUser = async ({
  userId,
  cooperativeId,
  bankCode,
  bankName = null,
  accountNumber,
  country = env.payout.country,
  currency = env.payout.currency
}) => {
  const membership = await getMembership(userId, cooperativeId);
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);
  if (!/^\d{10}$/.test(normalizedAccountNumber)) {
    throw new AppError('A Nigerian bank account number must contain 10 digits.', 422);
  }

  const normalizedCountry = String(country).toUpperCase();
  const normalizedCurrency = String(currency).toUpperCase();
  if (normalizedCountry !== 'NG' || normalizedCurrency !== 'NGN') {
    throw new AppError('Phase 3 currently supports NG bank accounts and NGN payouts only.', 422);
  }

  const accountNumberHash = hashAccountNumber(normalizedAccountNumber);
  const existing = await verifiedBankAccountRepository.findByHash({
    membershipId: membership.id,
    provider: PROVIDER,
    accountNumberHash
  });
  if (existing?.verification_status === 'VERIFIED') {
    return safeAccount(existing);
  }

  let response;
  try {
    response = await flutterwaveService.resolveAccount({
      accountNumber: normalizedAccountNumber,
      bankCode: String(bankCode).trim()
    });
  } catch (error) {
    throw new AppError('Bank account verification failed at the provider.', 502);
  }

  const providerData = response?.data || {};
  if (String(response?.status || '').toLowerCase() !== 'success' || !providerData.account_name) {
    logFlutterwaveEvent('error', 'flutterwave.bank_account.rejected', {
      status: response?.status || null,
      providerMessage: response?.message || null,
      providerData
    });
    throw new AppError(
      'The bank account could not be resolved.',
      422,
      null,
      'BANK_ACCOUNT_NOT_RESOLVED'
    );
  }

  const metadata = {
    provider: PROVIDER,
    nameMatchesProfile: String(providerData.account_name).trim().toLowerCase()
      === String(membership.name || '').trim().toLowerCase(),
    resolvedAt: new Date().toISOString()
  };
  const connection = await pool.getConnection();
  let account;
  try {
    await connection.beginTransaction();
    const locked = await verifiedBankAccountRepository.findByHash({
      membershipId: membership.id,
      provider: PROVIDER,
      accountNumberHash
    }, connection, true);
    account = locked || await verifiedBankAccountRepository.create({
      membershipId: membership.id,
      country: normalizedCountry,
      currency: normalizedCurrency,
      bankCode: String(bankCode).trim(),
      bankName,
      accountNumberHash,
      accountNumberEncrypted: encryptAccountNumber(normalizedAccountNumber),
      accountNumberMasked: maskAccountNumber(normalizedAccountNumber),
      accountName: String(providerData.account_name).trim(),
      provider: PROVIDER,
      providerAccountReference: providerData.reference || providerData.id || null,
      verificationStatus: 'VERIFIED',
      verificationMetadata: metadata
    }, connection);
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = await verifiedBankAccountRepository.findByHash({
        membershipId: membership.id,
        provider: PROVIDER,
        accountNumberHash
      });
      if (duplicate) {
        return safeAccount(duplicate);
      }
    }
    throw error;
  } finally {
    connection.release();
  }

  return safeAccount(account);
};

module.exports = {
  listBanks,
  listForUser,
  verifyForUser,
  safeAccount
};
