const { pool } = require('../config/database');

const columns = `
  pi.id,
  pi.cooperative_membership_id,
  pi.provider,
  pi.provider_identity_type,
  pi.provider_reference,
  pi.virtual_account_reference,
  pi.transaction_reference,
  pi.account_number,
  pi.account_name,
  pi.bank_name,
  pi.currency,
  pi.status,
  pi.provisioning_error,
  pi.metadata,
  pi.created_at,
  pi.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `SELECT ${columns} FROM payment_identities pi WHERE pi.id = :id LIMIT 1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    { id }
  );
  return rows[0] || null;
};

const findByMembershipId = async (membershipId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payment_identities pi
      WHERE pi.cooperative_membership_id = :membershipId
        AND pi.provider = 'FLUTTERWAVE'
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { membershipId }
  );
  return rows[0] || null;
};

const findByProviderReference = async (providerReference, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payment_identities pi
      WHERE pi.provider = 'FLUTTERWAVE'
        AND pi.provider_reference = :providerReference
      LIMIT 1
    `,
    { providerReference }
  );
  return rows[0] || null;
};

const findForWebhook = async (
  {
    providerReference = null,
    transactionReference = null,
    virtualAccountReference = null,
    accountNumber = null
  },
  db = pool
) => {
  const conditions = [];
  const params = {
    providerReference,
    transactionReference,
    virtualAccountReference,
    accountNumber
  };

  if (providerReference) {
    conditions.push('pi.provider_reference = :providerReference');
  }

  if (transactionReference) {
    conditions.push('pi.transaction_reference = :transactionReference');
  }

  if (virtualAccountReference) {
    conditions.push('pi.virtual_account_reference = :virtualAccountReference');
  }

  if (accountNumber) {
    conditions.push('pi.account_number = :accountNumber');
  }

  if (conditions.length === 0) {
    return null;
  }

  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payment_identities pi
      WHERE pi.provider = 'FLUTTERWAVE'
        AND (${conditions.join(' OR ')})
      ORDER BY CASE
        WHEN pi.provider_reference = :providerReference THEN 1
        WHEN pi.transaction_reference = :transactionReference THEN 2
        WHEN pi.virtual_account_reference = :virtualAccountReference THEN 3
        WHEN pi.account_number = :accountNumber THEN 4
        ELSE 5
      END,
      pi.id ASC
      LIMIT 1
    `,
    params
  );
  return rows[0] || null;
};

const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        cm.user_id,
        u.name AS member_name,
        u.email AS member_email,
        c.name AS cooperative_name
      FROM payment_identities pi
      INNER JOIN cooperative_memberships cm ON cm.id = pi.cooperative_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN cooperatives c ON c.id = cm.cooperative_id
      WHERE cm.cooperative_id = :cooperativeId
        AND pi.provider = 'FLUTTERWAVE'
      ORDER BY cm.created_at ASC
    `,
    { cooperativeId }
  );
  return rows;
};

const findAll = async (db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        cm.user_id,
        cm.cooperative_id,
        u.name AS member_name,
        u.email AS member_email,
        c.name AS cooperative_name
      FROM payment_identities pi
      INNER JOIN cooperative_memberships cm ON cm.id = pi.cooperative_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN cooperatives c ON c.id = cm.cooperative_id
      WHERE pi.provider = 'FLUTTERWAVE'
      ORDER BY pi.updated_at DESC
    `
  );
  return rows;
};

const createProvisioning = async (membershipId, metadata = {}, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO payment_identities (
        cooperative_membership_id,
        provider,
        provider_identity_type,
        transaction_reference,
        status,
        metadata
      )
      VALUES (:membershipId, 'FLUTTERWAVE', 'VIRTUAL_ACCOUNT', :transactionReference, 'PROVISIONING', :metadata)
    `,
    {
      membershipId,
      transactionReference: metadata.reference || null,
      metadata: JSON.stringify(metadata)
    }
  );
  return findById(result.insertId, db);
};

const markProvisioning = async (id, db = pool) => {
  await db.execute(
    `
      UPDATE payment_identities
      SET status = 'PROVISIONING', provisioning_error = NULL
      WHERE id = :id
    `,
    { id }
  );
  return findById(id, db);
};

const markActive = async (
  id,
  {
    providerReference,
    virtualAccountReference,
    transactionReference,
    accountNumber,
    accountName,
    bankName,
    currency,
    metadata
  },
  db = pool
) => {
  await db.execute(
    `
      UPDATE payment_identities
      SET
        provider_reference = :providerReference,
        virtual_account_reference = :virtualAccountReference,
        transaction_reference = :transactionReference,
        account_number = :accountNumber,
        account_name = :accountName,
        bank_name = :bankName,
        currency = :currency,
        status = 'ACTIVE',
        provisioning_error = NULL,
        metadata = :metadata
      WHERE id = :id
    `,
    {
      id,
      providerReference,
      virtualAccountReference,
      transactionReference,
      accountNumber,
      accountName,
      bankName,
      currency,
      metadata: JSON.stringify(metadata || {})
    }
  );
  return findById(id, db);
};

const markFailed = async (id, provisioningError, db = pool) => {
  await db.execute(
    `
      UPDATE payment_identities
      SET status = 'FAILED', provisioning_error = :provisioningError
      WHERE id = :id
    `,
    { id, provisioningError: String(provisioningError || 'Provider provisioning failed.').slice(0, 2000) }
  );
  return findById(id, db);
};

module.exports = {
  findById,
  findByMembershipId,
  findByProviderReference,
  findForWebhook,
  findAllByCooperativeId,
  findAll,
  createProvisioning,
  markProvisioning,
  markActive,
  markFailed
};
