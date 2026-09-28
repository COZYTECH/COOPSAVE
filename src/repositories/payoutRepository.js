const { pool } = require('../config/database');

const columns = `
  p.id,
  p.cooperative_id,
  p.cycle_id,
  p.recipient_membership_id,
  p.bank_account_id,
  p.amount,
  p.currency,
  p.provider,
  p.provider_transfer_id,
  p.provider_reference,
  p.internal_reference,
  p.status,
  p.failure_reason,
  p.metadata,
  p.initiated_at,
  p.completed_at,
  p.created_at,
  p.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `SELECT ${columns} FROM payouts p WHERE p.id = :id LIMIT 1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    { id }
  );
  return rows[0] || null;
};

const findByCycleAndRecipient = async (cycleId, membershipId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payouts p
      WHERE p.cycle_id = :cycleId
        AND p.recipient_membership_id = :membershipId
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { cycleId, membershipId }
  );
  return rows[0] || null;
};

const findByProviderIdentifiers = async ({ provider, providerTransferId = null, providerReference = null }, db = pool, forUpdate = false) => {
  const conditions = [];
  const params = { provider };
  if (providerTransferId) {
    conditions.push('p.provider_transfer_id = :providerTransferId');
    params.providerTransferId = providerTransferId;
  }
  if (providerReference) {
    conditions.push('p.provider_reference = :providerReference');
    params.providerReference = providerReference;
  }
  if (!conditions.length) return null;
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payouts p
      WHERE p.provider = :provider
        AND (${conditions.join(' OR ')})
      ORDER BY p.id ASC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    params
  );
  return rows[0] || null;
};

const create = async ({
  cooperativeId,
  cycleId,
  recipientMembershipId,
  bankAccountId,
  amount,
  currency,
  provider = 'FLUTTERWAVE',
  internalReference,
  status = 'INITIATED',
  metadata = {},
  initiatedAt = new Date()
}, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO payouts (
        cooperative_id, cycle_id, recipient_membership_id, bank_account_id,
        amount, currency, provider, internal_reference, status, metadata, initiated_at
      )
      VALUES (
        :cooperativeId, :cycleId, :recipientMembershipId, :bankAccountId,
        :amount, :currency, :provider, :internalReference, :status, :metadata, :initiatedAt
      )
    `,
    {
      cooperativeId,
      cycleId,
      recipientMembershipId,
      bankAccountId,
      amount,
      currency,
      provider,
      internalReference,
      status,
      metadata: JSON.stringify(metadata),
      initiatedAt
    }
  );
  return findById(result.insertId, db);
};

const updateStatus = async (id, status, { failureReason = null, completedAt = null } = {}, db = pool) => {
  await db.execute(
    `
      UPDATE payouts
      SET status = :status,
        failure_reason = :failureReason,
        completed_at = :completedAt
      WHERE id = :id
    `,
    { id, status, failureReason, completedAt }
  );
  return findById(id, db);
};

const updateProviderData = async (id, { providerTransferId = null, providerReference = null, metadata = {}, status, failureReason = null, completedAt = null }, db = pool) => {
  await db.execute(
    `
      UPDATE payouts
      SET provider_transfer_id = COALESCE(:providerTransferId, provider_transfer_id),
        provider_reference = COALESCE(:providerReference, provider_reference),
        metadata = :metadata,
        status = :status,
        failure_reason = :failureReason,
        completed_at = :completedAt
      WHERE id = :id
    `,
    {
      id,
      providerTransferId,
      providerReference,
      metadata: JSON.stringify(metadata),
      status,
      failureReason,
      completedAt
    }
  );
  return findById(id, db);
};

const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}, u.name AS recipient_name, u.email AS recipient_email,
        ac.name AS cycle_name, vba.account_number_masked, vba.bank_name,
        pa.attempt_number, pa.provider_transfer_id AS attempt_transfer_id,
        pa.provider_reference AS attempt_reference, pa.status AS attempt_status
      FROM payouts p
      INNER JOIN cooperative_memberships cm ON cm.id = p.recipient_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN ajo_cycles ac ON ac.id = p.cycle_id
      INNER JOIN verified_bank_accounts vba ON vba.id = p.bank_account_id
      LEFT JOIN payout_attempts pa ON pa.id = (
        SELECT MAX(pa2.id) FROM payout_attempts pa2 WHERE pa2.payout_id = p.id
      )
      WHERE p.cooperative_id = :cooperativeId
      ORDER BY p.created_at DESC
    `,
    { cooperativeId }
  );
  return rows;
};

const findAll = async (db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}, c.name AS cooperative_name, u.name AS recipient_name,
        ac.name AS cycle_name, vba.account_number_masked, vba.bank_name,
        pa.attempt_number, pa.provider_transfer_id AS attempt_transfer_id,
        pa.provider_reference AS attempt_reference, pa.status AS attempt_status
      FROM payouts p
      INNER JOIN cooperatives c ON c.id = p.cooperative_id
      INNER JOIN cooperative_memberships cm ON cm.id = p.recipient_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN ajo_cycles ac ON ac.id = p.cycle_id
      INNER JOIN verified_bank_accounts vba ON vba.id = p.bank_account_id
      LEFT JOIN payout_attempts pa ON pa.id = (
        SELECT MAX(pa2.id) FROM payout_attempts pa2 WHERE pa2.payout_id = p.id
      )
      ORDER BY p.created_at DESC
    `
  );
  return rows;
};

const findAllByMembershipId = async (membershipId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}, ac.name AS cycle_name, vba.account_number_masked, vba.bank_name,
        pa.attempt_number, pa.provider_transfer_id AS attempt_transfer_id,
        pa.provider_reference AS attempt_reference, pa.status AS attempt_status
      FROM payouts p
      INNER JOIN ajo_cycles ac ON ac.id = p.cycle_id
      INNER JOIN verified_bank_accounts vba ON vba.id = p.bank_account_id
      LEFT JOIN payout_attempts pa ON pa.id = (
        SELECT MAX(pa2.id) FROM payout_attempts pa2 WHERE pa2.payout_id = p.id
      )
      WHERE p.recipient_membership_id = :membershipId
      ORDER BY p.created_at DESC
    `,
    { membershipId }
  );
  return rows;
};

const prepareRetry = async (id, { amount, bankAccountId, metadata = {} }, db = pool) => {
  await db.execute(
    `
      UPDATE payouts
      SET amount = :amount,
        bank_account_id = :bankAccountId,
        status = 'INITIATED',
        provider_transfer_id = NULL,
        provider_reference = NULL,
        failure_reason = NULL,
        completed_at = NULL,
        metadata = :metadata,
        initiated_at = NOW()
      WHERE id = :id
    `,
    { id, amount, bankAccountId, metadata: JSON.stringify(metadata) }
  );
  return findById(id, db);
};

const getCycleAccounting = async (cycleId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT
        COALESCE(SUM(CASE WHEN le.entry_type = 'CONTRIBUTION' AND le.direction = 'CREDIT' THEN le.amount ELSE 0 END), 0) AS credits,
        COALESCE(SUM(CASE WHEN le.entry_type = 'PAYOUT' AND le.direction = 'DEBIT' THEN le.amount ELSE 0 END), 0) AS debits
      FROM ledger_entries le
      WHERE le.cycle_id = :cycleId
    `,
    { cycleId }
  );
  return rows[0] || { credits: '0.00', debits: '0.00' };
};

const getReservedPayoutAmount = async (cycleId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT COALESCE(SUM(amount), 0) AS reserved_amount
      FROM payouts
      WHERE cycle_id = :cycleId
        AND status IN ('DRAFT', 'ELIGIBLE', 'INITIATED', 'PENDING', 'UNKNOWN', 'RECONCILIATION_REQUIRED')
    `,
    { cycleId }
  );
  return rows[0]?.reserved_amount || '0.00';
};

module.exports = {
  findById,
  findByCycleAndRecipient,
  findByProviderIdentifiers,
  create,
  updateStatus,
  updateProviderData,
  findAllByCooperativeId,
  findAll,
  findAllByMembershipId,
  prepareRetry,
  getCycleAccounting,
  getReservedPayoutAmount
};
