const { pool } = require('../config/database');

const columns = `
  pt.id,
  pt.provider,
  pt.provider_transaction_id,
  pt.provider_reference,
  pt.payment_identity_id,
  pt.membership_id,
  pt.cooperative_id,
  pt.obligation_id,
  pt.source_webhook_event_id,
  pt.gross_amount,
  pt.currency,
  pt.provider_fee,
  pt.pamoja_fee,
  pt.net_amount,
  pt.status,
  pt.allocation_status,
  pt.transaction_type,
  pt.internal_reference,
  pt.metadata,
  pt.created_at,
  pt.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payment_transactions pt
      WHERE pt.id = :id
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { id }
  );
  return rows[0] || null;
};

const findByProviderIdentifiers = async (
  { provider, providerTransactionId = null, providerReference = null },
  db = pool,
  forUpdate = false
) => {
  const conditions = [];
  const params = { provider };

  if (providerTransactionId) {
    conditions.push('pt.provider_transaction_id = :providerTransactionId');
    params.providerTransactionId = providerTransactionId;
  }
  if (providerReference) {
    conditions.push('pt.provider_reference = :providerReference');
    params.providerReference = providerReference;
  }
  if (conditions.length === 0) {
    return null;
  }

  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payment_transactions pt
      WHERE pt.provider = :provider
        AND (${conditions.join(' OR ')})
      ORDER BY pt.id ASC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    params
  );
  return rows[0] || null;
};

const findByInternalReference = async (internalReference, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payment_transactions pt
      WHERE pt.internal_reference = :internalReference
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { internalReference }
  );
  return rows[0] || null;
};

const create = async ({
  provider,
  providerTransactionId,
  providerReference,
  paymentIdentityId,
  membershipId,
  cooperativeId,
  obligationId = null,
  sourceWebhookEventId,
  grossAmount,
  currency,
  providerFee = null,
  pamojaFee = null,
  netAmount,
  status = 'INITIATED',
  allocationStatus = 'UNALLOCATED',
  transactionType = 'CONTRIBUTION',
  internalReference,
  metadata = {}
}, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO payment_transactions (
        provider,
        provider_transaction_id,
        provider_reference,
        payment_identity_id,
        membership_id,
        cooperative_id,
        obligation_id,
        source_webhook_event_id,
        gross_amount,
        currency,
        provider_fee,
        pamoja_fee,
        net_amount,
        status,
        allocation_status,
        transaction_type,
        internal_reference,
        metadata
      )
      VALUES (
        :provider,
        :providerTransactionId,
        :providerReference,
        :paymentIdentityId,
        :membershipId,
        :cooperativeId,
        :obligationId,
        :sourceWebhookEventId,
        :grossAmount,
        :currency,
        :providerFee,
        :pamojaFee,
        :netAmount,
        :status,
        :allocationStatus,
        :transactionType,
        :internalReference,
        :metadata
      )
    `,
    {
      provider,
      providerTransactionId: providerTransactionId || null,
      providerReference: providerReference || null,
      paymentIdentityId,
      membershipId,
      cooperativeId,
      obligationId,
      sourceWebhookEventId: sourceWebhookEventId || null,
      grossAmount,
      currency,
      providerFee,
      pamojaFee,
      netAmount,
      status,
      allocationStatus,
      transactionType,
      internalReference,
      metadata: JSON.stringify(metadata)
    }
  );
  return findById(result.insertId, db);
};

const updateProviderIdentifiers = async (
  id,
  { providerTransactionId = null, providerReference = null, sourceWebhookEventId = null },
  db = pool
) => {
  await db.execute(
    `
      UPDATE payment_transactions
      SET
        provider_transaction_id = COALESCE(:providerTransactionId, provider_transaction_id),
        provider_reference = COALESCE(:providerReference, provider_reference),
        source_webhook_event_id = COALESCE(:sourceWebhookEventId, source_webhook_event_id)
      WHERE id = :id
    `,
    { id, providerTransactionId, providerReference, sourceWebhookEventId }
  );
  return findById(id, db);
};

const updateStatus = async (id, status, db = pool) => {
  await db.execute(
    `UPDATE payment_transactions SET status = :status WHERE id = :id`,
    { id, status }
  );
  return findById(id, db);
};

const updateAllocationStatus = async (id, allocationStatus, db = pool) => {
  await db.execute(
    `UPDATE payment_transactions SET allocation_status = :allocationStatus WHERE id = :id`,
    { id, allocationStatus }
  );
  return findById(id, db);
};

const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        u.name AS member_name,
        u.email AS member_email,
        ac.name AS cycle_name
      FROM payment_transactions pt
      INNER JOIN cooperative_memberships gm ON gm.id = pt.membership_id
      INNER JOIN users u ON u.id = gm.user_id
      LEFT JOIN contribution_obligations checkout_obligation
        ON checkout_obligation.id = pt.obligation_id
      LEFT JOIN (
        SELECT oa.payment_transaction_id, MIN(co.cycle_id) AS cycle_id
        FROM obligation_allocations oa
        INNER JOIN contribution_obligations co ON co.id = oa.obligation_id
        GROUP BY oa.payment_transaction_id
      ) allocation_summary ON allocation_summary.payment_transaction_id = pt.id
      LEFT JOIN ajo_cycles ac
        ON ac.id = COALESCE(checkout_obligation.cycle_id, allocation_summary.cycle_id)
      WHERE pt.cooperative_id = :cooperativeId
      ORDER BY pt.created_at DESC
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
        u.name AS member_name,
        u.email AS member_email,
        c.name AS cooperative_name,
        ac.name AS cycle_name
      FROM payment_transactions pt
      INNER JOIN cooperative_memberships gm ON gm.id = pt.membership_id
      INNER JOIN users u ON u.id = gm.user_id
      INNER JOIN cooperatives c ON c.id = pt.cooperative_id
      LEFT JOIN contribution_obligations checkout_obligation
        ON checkout_obligation.id = pt.obligation_id
      LEFT JOIN (
        SELECT oa.payment_transaction_id, MIN(co.cycle_id) AS cycle_id
        FROM obligation_allocations oa
        INNER JOIN contribution_obligations co ON co.id = oa.obligation_id
        GROUP BY oa.payment_transaction_id
      ) allocation_summary ON allocation_summary.payment_transaction_id = pt.id
      LEFT JOIN ajo_cycles ac
        ON ac.id = COALESCE(checkout_obligation.cycle_id, allocation_summary.cycle_id)
      ORDER BY pt.created_at DESC
    `
  );
  return rows;
};

const findAllByMembershipId = async (membershipId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        ac.name AS cycle_name,
        oa.amount_allocated,
        oa.amount_excess
      FROM payment_transactions pt
      LEFT JOIN obligation_allocations oa ON oa.payment_transaction_id = pt.id
      LEFT JOIN contribution_obligations co
        ON co.id = COALESCE(pt.obligation_id, oa.obligation_id)
      LEFT JOIN ajo_cycles ac ON ac.id = co.cycle_id
      WHERE pt.membership_id = :membershipId
      ORDER BY pt.created_at DESC
    `,
    { membershipId }
  );
  return rows;
};

module.exports = {
  findById,
  findByProviderIdentifiers,
  findByInternalReference,
  create,
  updateProviderIdentifiers,
  updateStatus,
  updateAllocationStatus,
  findAllByCooperativeId,
  findAll,
  findAllByMembershipId
};
