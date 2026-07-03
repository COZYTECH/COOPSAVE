const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env.seed') });
dotenv.config();

const CORE_TABLES = [
  'owners',
  'cooperatives',
  'members',
  'virtual_accounts',
  'transactions',
  'contributions',
  'webhook_events'
];

const TABLE_ALIASES = {
  owners: ['owners', 'users']
};

const INTERNAL_TABLES = new Set(['schema_migrations']);
const LOOKUP_TABLE_PATTERNS = [
  /_types$/,
  /_statuses$/,
  /_categories$/,
  /_settings$/,
  /_lookup$/,
  /^roles$/,
  /^permissions$/
];

const quoteIdentifier = (identifier) => {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }

  return `\`${identifier}\``;
};

const requireEnv = (key) => {
  const value = process.env[key];

  if (!value && value !== '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getDbConfig = (prefix) => ({
  host: requireEnv(`${prefix}_DB_HOST`),
  port: Number(process.env[`${prefix}_DB_PORT`] || 3306),
  user: requireEnv(`${prefix}_DB_USER`),
  password: process.env[`${prefix}_DB_PASSWORD`] || '',
  database: requireEnv(`${prefix}_DB_NAME`),
  namedPlaceholders: true,
  multipleStatements: false
});

const connect = async (label, prefix) => {
  const connection = await mysql.createConnection(getDbConfig(prefix));
  console.log(`Connected to ${label} DB...`);
  return connection;
};

const getTables = async (connection) => {
  const [rows] = await connection.execute(
    `
      SELECT TABLE_NAME AS table_name
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `
  );

  return new Set(rows.map((row) => row.table_name));
};

const resolveCoreTable = (logicalTable, localTables, railwayTables) => {
  const candidates = TABLE_ALIASES[logicalTable] || [logicalTable];

  return candidates.find(
    (tableName) => localTables.has(tableName) && railwayTables.has(tableName)
  );
};

const isLookupTable = (tableName) => {
  return LOOKUP_TABLE_PATTERNS.some((pattern) => pattern.test(tableName));
};

const getForeignKeyDependencies = async (connection, tableNames) => {
  if (tableNames.length === 0) {
    return new Map();
  }

  const placeholders = tableNames.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `
      SELECT
        TABLE_NAME AS table_name,
        REFERENCED_TABLE_NAME AS referenced_table_name
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${placeholders})
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    tableNames
  );

  const dependencies = new Map(tableNames.map((tableName) => [tableName, new Set()]));

  for (const row of rows) {
    if (dependencies.has(row.referenced_table_name)) {
      dependencies.get(row.table_name).add(row.referenced_table_name);
    }
  }

  return dependencies;
};

const sortByDependencies = async (connection, tablePlan) => {
  const tableNames = tablePlan.map((entry) => entry.tableName);
  const dependencies = await getForeignKeyDependencies(connection, tableNames);
  const remaining = new Map(tablePlan.map((entry) => [entry.tableName, entry]));
  const sorted = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((entry) => {
        const requiredTables = dependencies.get(entry.tableName) || new Set();
        return [...requiredTables].every(
          (dependency) => !remaining.has(dependency)
        );
      })
      .sort((a, b) => a.weight - b.weight || a.tableName.localeCompare(b.tableName));

    if (ready.length === 0) {
      throw new Error('Could not resolve table dependency order for seeding.');
    }

    const next = ready[0];
    sorted.push(next);
    remaining.delete(next.tableName);
  }

  return sorted;
};

const buildTablePlan = async (localConnection, railwayConnection) => {
  const localTables = await getTables(localConnection);
  const railwayTables = await getTables(railwayConnection);
  const selectedTables = new Map();

  CORE_TABLES.forEach((logicalTable, index) => {
    const tableName = resolveCoreTable(logicalTable, localTables, railwayTables);

    if (tableName) {
      selectedTables.set(tableName, {
        logicalTable,
        tableName,
        weight: index
      });
      return;
    }

    const expectedNames = TABLE_ALIASES[logicalTable] || [logicalTable];
    const existsLocally = expectedNames.some((name) => localTables.has(name));

    if (existsLocally) {
      throw new Error(
        `Railway DB is missing table for ${logicalTable}. Run migrations before seeding.`
      );
    }
  });

  const commonTables = [...localTables].filter((tableName) =>
    railwayTables.has(tableName)
  );

  commonTables
    .filter((tableName) => !selectedTables.has(tableName))
    .filter((tableName) => !INTERNAL_TABLES.has(tableName))
    .filter(isLookupTable)
    .forEach((tableName) => {
      selectedTables.set(tableName, {
        logicalTable: tableName,
        tableName,
        weight: -1
      });
    });

  return sortByDependencies(railwayConnection, [...selectedTables.values()]);
};

const getCommonColumns = async (localConnection, railwayConnection, tableName) => {
  const columnSql = `
    SELECT COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `;

  const [localColumns] = await localConnection.execute(columnSql, [tableName]);
  const [railwayColumns] = await railwayConnection.execute(columnSql, [tableName]);
  const railwayColumnSet = new Set(
    railwayColumns.map((column) => column.column_name)
  );

  return localColumns
    .map((column) => column.column_name)
    .filter((columnName) => railwayColumnSet.has(columnName));
};

const normalizeValue = (value) => {
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }

  return value;
};

const copyTable = async (localConnection, railwayConnection, entry) => {
  const { logicalTable, tableName } = entry;
  const displayName =
    logicalTable === tableName ? logicalTable : `${logicalTable} (${tableName})`;

  console.log(`Copying ${displayName}...`);

  const columns = await getCommonColumns(localConnection, railwayConnection, tableName);

  if (columns.length === 0) {
    console.log('Copied 0 rows');
    return;
  }

  const [rows] = await localConnection.query(
    `SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(tableName)}`
  );

  if (rows.length === 0) {
    console.log('Copied 0 rows');
    return;
  }

  const insertSql = `
    INSERT IGNORE INTO ${quoteIdentifier(tableName)}
      (${columns.map(quoteIdentifier).join(', ')})
    VALUES ?
  `;
  const values = rows.map((row) =>
    columns.map((columnName) => normalizeValue(row[columnName]))
  );

  const [result] = await railwayConnection.query(insertSql, [values]);
  console.log(`Copied ${result.affectedRows} rows`);
};

const seedRailway = async () => {
  let localConnection;
  let railwayConnection;

  try {
    localConnection = await connect('local', 'LOCAL');
    railwayConnection = await connect('Railway', 'RAILWAY');

    const tablePlan = await buildTablePlan(localConnection, railwayConnection);

    for (const entry of tablePlan) {
      await copyTable(localConnection, railwayConnection, entry);
    }

    console.log('Completed successfully.');
  } finally {
    if (localConnection) {
      await localConnection.end();
    }

    if (railwayConnection) {
      await railwayConnection.end();
    }
  }
};

seedRailway().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
