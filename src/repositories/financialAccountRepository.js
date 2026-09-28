const { pool } = require('../config/database');

// This read model aggregates existing financial tables for Platform Admin.
// It does not create, update, or replace any accounting records.
const accountSummaryCte = `
  WITH identity_summary AS (
    SELECT
      cm.cooperative_id,
      COUNT(pi.id) AS provider_identity_count,
      SUM(CASE WHEN pi.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_identity_count,
      SUM(CASE WHEN pi.status = 'PROVISIONING' THEN 1 ELSE 0 END) AS provisioning_identity_count,
      SUM(CASE WHEN pi.status = 'FAILED' THEN 1 ELSE 0 END) AS failed_identity_count,
      SUM(CASE WHEN pi.status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspended_identity_count,
      MAX(pi.provider) AS provider,
      MAX(pi.provider_identity_type) AS provider_identity_type,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN pi.account_number IS NOT NULL THEN CONCAT('********', RIGHT(pi.account_number, 4))
          WHEN pi.provider_reference IS NOT NULL THEN CONCAT('********', RIGHT(pi.provider_reference, 4))
          ELSE NULL
          END
        SEPARATOR ', '
      ) AS provider_identity,
      MAX(pi.updated_at) AS identity_updated_at
    FROM cooperative_memberships cm
    LEFT JOIN payment_identities pi
      ON pi.cooperative_membership_id = cm.id
    GROUP BY cm.cooperative_id
  ),
  ledger_summary AS (
    SELECT
      cooperative_id,
      COALESCE(SUM(CASE WHEN entry_type = 'CONTRIBUTION' AND direction = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_contributions,
      COALESCE(SUM(CASE WHEN entry_type = 'PAYOUT' AND direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_paid_out
    FROM ledger_entries
    GROUP BY cooperative_id
  ),
  reserved_payout_summary AS (
    SELECT
      cooperative_id,
      COALESCE(SUM(amount), 0) AS reserved_payouts
    FROM payouts
    WHERE status IN ('DRAFT', 'ELIGIBLE', 'INITIATED', 'PENDING', 'UNKNOWN', 'RECONCILIATION_REQUIRED')
    GROUP BY cooperative_id
  ),
  payment_summary AS (
    SELECT
      cooperative_id,
      SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_payment_count,
      SUM(CASE WHEN status IN ('INITIATED', 'PENDING') THEN 1 ELSE 0 END) AS pending_payment_count,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_payment_count,
      SUM(CASE WHEN status IN ('UNKNOWN', 'RECONCILIATION_REQUIRED') THEN 1 ELSE 0 END) AS unresolved_payment_count
    FROM payment_transactions
    GROUP BY cooperative_id
  ),
  obligation_summary AS (
    SELECT
      ac.cooperative_id,
      COALESCE(SUM(CASE
        WHEN co.status IN ('PENDING', 'PARTIAL', 'OVERDUE', 'EXCESS_PENDING_REVIEW')
        THEN co.amount_outstanding ELSE 0 END), 0) AS outstanding_contributions
    FROM contribution_obligations co
    INNER JOIN ajo_cycles ac ON ac.id = co.cycle_id
    GROUP BY ac.cooperative_id
  ),
  unresolved_payout_summary AS (
    SELECT
      cooperative_id,
      SUM(CASE WHEN status IN ('UNKNOWN', 'RECONCILIATION_REQUIRED') THEN 1 ELSE 0 END) AS unresolved_payout_count
    FROM payouts
    GROUP BY cooperative_id
  ),
  account_summary AS (
    SELECT
      c.id AS cooperative_id,
      c.name AS cooperative_name,
      c.description AS cooperative_description,
      c.created_at AS cooperative_created_at,
      COALESCE(ids.provider_identity_count, 0) AS provider_identity_count,
      COALESCE(ids.active_identity_count, 0) AS active_identity_count,
      ids.provider,
      ids.provider_identity_type,
      ids.provider_identity,
      ids.identity_updated_at,
      CASE
        WHEN COALESCE(ids.provider_identity_count, 0) = 0 THEN 'PROVISIONING'
        WHEN ids.active_identity_count = ids.provider_identity_count THEN 'ACTIVE'
        WHEN ids.failed_identity_count = ids.provider_identity_count THEN 'FAILED'
        WHEN ids.suspended_identity_count = ids.provider_identity_count THEN 'SUSPENDED'
        ELSE 'PROVISIONING'
      END AS account_status,
      COALESCE(ls.total_contributions, 0) AS total_contributions,
      COALESCE(ls.total_paid_out, 0) AS total_paid_out,
      COALESCE(rps.reserved_payouts, 0) AS reserved_payouts,
      GREATEST(
        0,
        COALESCE(ls.total_contributions, 0)
          - COALESCE(ls.total_paid_out, 0)
          - COALESCE(rps.reserved_payouts, 0)
      ) AS available_for_payout,
      COALESCE(os.outstanding_contributions, 0) AS outstanding_contributions,
      COALESCE(ps.successful_payment_count, 0) AS successful_payment_count,
      COALESCE(ps.pending_payment_count, 0) AS pending_payment_count,
      COALESCE(ps.failed_payment_count, 0) AS failed_payment_count,
      COALESCE(ps.unresolved_payment_count, 0) AS unresolved_payment_count,
      COALESCE(ups.unresolved_payout_count, 0) AS unresolved_payout_count
    FROM cooperatives c
    LEFT JOIN identity_summary ids ON ids.cooperative_id = c.id
    LEFT JOIN ledger_summary ls ON ls.cooperative_id = c.id
    LEFT JOIN reserved_payout_summary rps ON rps.cooperative_id = c.id
    LEFT JOIN payment_summary ps ON ps.cooperative_id = c.id
    LEFT JOIN obligation_summary os ON os.cooperative_id = c.id
    LEFT JOIN unresolved_payout_summary ups ON ups.cooperative_id = c.id
  )
`;

const buildFilters = ({ search = '', status = '', provider = '' } = {}) => {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push('(account_summary.cooperative_name LIKE :search OR CAST(account_summary.cooperative_id AS CHAR) LIKE :search)');
    params.search = `%${search}%`;
  }

  if (status) {
    conditions.push('account_summary.account_status = :status');
    params.status = status;
  }

  if (provider) {
    conditions.push('account_summary.provider = :provider');
    params.provider = provider;
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

const findAccounts = async ({ search = '', status = '', provider = '', limit = 25, offset = 0 } = {}, db = pool) => {
  const filters = buildFilters({ search, status, provider });
  const [rows] = await db.execute(
    `${accountSummaryCte}
      SELECT *
      FROM account_summary
      ${filters.clause}
      ORDER BY cooperative_name ASC, cooperative_id ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    filters.params
  );

  const [countRows] = await db.execute(
    `${accountSummaryCte}
      SELECT COUNT(*) AS total
      FROM account_summary
      ${filters.clause}`,
    filters.params
  );

  return { rows, total: Number(countRows[0]?.total || 0) };
};

const getSummary = async (db = pool) => {
  const [rows] = await db.execute(
    `${accountSummaryCte}
      SELECT
        COUNT(*) AS total_accounts,
        SUM(CASE WHEN account_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_accounts,
        COALESCE(SUM(total_contributions), 0) AS total_contributions,
        COALESCE(SUM(available_for_payout), 0) AS available_for_payout
      FROM account_summary`
  );
  return rows[0] || {};
};

const findAccountByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `${accountSummaryCte}
      SELECT *
      FROM account_summary
      WHERE cooperative_id = :cooperativeId
      LIMIT 1`,
    { cooperativeId }
  );
  return rows[0] || null;
};

const findPaymentsByCooperativeId = async (cooperativeId, limit = 25, offset = 0, db = pool, cycleId = null) => {
  const cycleClause = cycleId ? ' AND ac.id = :cycleId' : '';
  const [rows] = await db.execute(
    `
      SELECT
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
        pt.updated_at,
        u.name AS member_name,
        u.email AS member_email,
        ac.name AS cycle_name
      FROM payment_transactions pt
      INNER JOIN cooperative_memberships cm ON cm.id = pt.membership_id
      INNER JOIN users u ON u.id = cm.user_id
      LEFT JOIN contribution_obligations co ON co.id = pt.obligation_id
      LEFT JOIN ajo_cycles ac ON ac.id = co.cycle_id
      WHERE pt.cooperative_id = :cooperativeId${cycleClause}
      ORDER BY pt.created_at DESC, pt.id DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
    { cooperativeId, ...(cycleId ? { cycleId } : {}) }
  );
  return rows;
};

const findPayoutsByCooperativeId = async (cooperativeId, limit = 25, offset = 0, db = pool, cycleId = null) => {
  const cycleClause = cycleId ? ' AND p.cycle_id = :cycleId' : '';
  const [rows] = await db.execute(
    `
      SELECT
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
        p.updated_at,
        c.name AS cooperative_name,
        u.name AS recipient_name,
        u.email AS recipient_email,
        ac.name AS cycle_name,
        vba.account_number_masked,
        vba.bank_name,
        pa.attempt_number,
        pa.provider_transfer_id AS attempt_transfer_id,
        pa.provider_reference AS attempt_reference,
        pa.status AS attempt_status
      FROM payouts p
      INNER JOIN cooperatives c ON c.id = p.cooperative_id
      INNER JOIN cooperative_memberships cm ON cm.id = p.recipient_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN ajo_cycles ac ON ac.id = p.cycle_id
      INNER JOIN verified_bank_accounts vba ON vba.id = p.bank_account_id
      LEFT JOIN payout_attempts pa ON pa.id = (
        SELECT MAX(pa2.id) FROM payout_attempts pa2 WHERE pa2.payout_id = p.id
      )
      WHERE p.cooperative_id = :cooperativeId${cycleClause}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
    { cooperativeId, ...(cycleId ? { cycleId } : {}) }
  );
  return rows;
};

const findLedgerEntriesByCooperativeId = async (cooperativeId, limit = 25, offset = 0, db = pool, cycleId = null) => {
  const cycleClause = cycleId ? ' AND le.cycle_id = :cycleId' : '';
  const [rows] = await db.execute(
    `
      SELECT
        le.id,
        le.cooperative_id,
        le.cycle_id,
        le.membership_id,
        le.obligation_id,
        le.payment_transaction_id,
        le.payout_id,
        le.entry_type,
        le.direction,
        le.amount,
        le.currency,
        le.reference,
        le.description,
        le.created_at
      FROM ledger_entries le
      WHERE le.cooperative_id = :cooperativeId${cycleClause}
      ORDER BY le.created_at DESC, le.id DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
    { cooperativeId, ...(cycleId ? { cycleId } : {}) }
  );
  return rows;
};

module.exports = {
  findAccounts,
  getSummary,
  findAccountByCooperativeId,
  findPaymentsByCooperativeId,
  findPayoutsByCooperativeId,
  findLedgerEntriesByCooperativeId
};
