const { pool } = require('../config/database');

const columns = `
  vba.id,
  vba.membership_id,
  vba.country,
  vba.currency,
  vba.bank_code,
  vba.bank_name,
  vba.account_number_hash,
  vba.account_number_encrypted,
  vba.account_number_masked,
  vba.account_name,
  vba.provider,
  vba.provider_account_reference,
  vba.verification_status,
  vba.verification_metadata,
  vba.verified_at,
  vba.created_at,
  vba.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `SELECT ${columns} FROM verified_bank_accounts vba WHERE vba.id = :id LIMIT 1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    { id }
  );
  return rows[0] || null;
};

const findByMembershipId = async (membershipId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM verified_bank_accounts vba
      WHERE vba.membership_id = :membershipId
      ORDER BY vba.updated_at DESC
    `,
    { membershipId }
  );
  return rows;
};

const findVerifiedByMembershipId = async (membershipId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM verified_bank_accounts vba
      WHERE vba.membership_id = :membershipId
        AND vba.verification_status = 'VERIFIED'
      ORDER BY vba.updated_at DESC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { membershipId }
  );
  return rows[0] || null;
};

const findByHash = async ({ membershipId, provider, accountNumberHash }, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM verified_bank_accounts vba
      WHERE vba.membership_id = :membershipId
        AND vba.provider = :provider
        AND vba.account_number_hash = :accountNumberHash
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { membershipId, provider, accountNumberHash }
  );
  return rows[0] || null;
};

const create = async ({
  membershipId,
  country,
  currency,
  bankCode,
  bankName,
  accountNumberHash,
  accountNumberEncrypted,
  accountNumberMasked,
  accountName,
  provider = 'FLUTTERWAVE',
  providerAccountReference = null,
  verificationStatus = 'VERIFIED',
  verificationMetadata = {},
  verifiedAt = new Date()
}, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO verified_bank_accounts (
        membership_id,
        country,
        currency,
        bank_code,
        bank_name,
        account_number_hash,
        account_number_encrypted,
        account_number_masked,
        account_name,
        provider,
        provider_account_reference,
        verification_status,
        verification_metadata,
        verified_at
      )
      VALUES (
        :membershipId,
        :country,
        :currency,
        :bankCode,
        :bankName,
        :accountNumberHash,
        :accountNumberEncrypted,
        :accountNumberMasked,
        :accountName,
        :provider,
        :providerAccountReference,
        :verificationStatus,
        :verificationMetadata,
        :verifiedAt
      )
    `,
    {
      membershipId,
      country,
      currency,
      bankCode,
      bankName: bankName || null,
      accountNumberHash,
      accountNumberEncrypted,
      accountNumberMasked,
      accountName,
      provider,
      providerAccountReference,
      verificationStatus,
      verificationMetadata: JSON.stringify(verificationMetadata),
      verifiedAt
    }
  );
  return findById(result.insertId, db);
};

const updateVerification = async (id, { status, metadata = {}, accountName = null }, db = pool) => {
  await db.execute(
    `
      UPDATE verified_bank_accounts
      SET
        verification_status = :status,
        verification_metadata = :metadata,
        account_name = COALESCE(:accountName, account_name),
        verified_at = CASE WHEN :status = 'VERIFIED' THEN COALESCE(verified_at, NOW()) ELSE verified_at END
      WHERE id = :id
    `,
    { id, status, metadata: JSON.stringify(metadata), accountName }
  );
  return findById(id, db);
};

module.exports = {
  findById,
  findByMembershipId,
  findVerifiedByMembershipId,
  findByHash,
  create,
  updateVerification
};
