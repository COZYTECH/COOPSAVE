const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const env = require('../src/config/env');
const { pool } = require('../src/config/database');

dotenv.config();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_EMAIL = 'platform-admin-test@pamoja.local';

const seedPlatformAdmin = async () => {
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = String(process.env.PLATFORM_ADMIN_PASSWORD || '');

  if (env.nodeEnv === 'production' || !LOCAL_HOSTS.has(String(env.database.host))) {
    throw new Error('Platform-admin seeding is restricted to a local database.');
  }

  if (!email.endsWith('.local')) {
    throw new Error('PLATFORM_ADMIN_EMAIL must use a .local address.');
  }

  if (password.length < 12) {
    throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { email }
    );
    const passwordHash = await bcrypt.hash(password, 12);

    if (existingRows[0]) {
      await connection.execute(
        `
          UPDATE users
          SET name = :name,
              password_hash = :passwordHash,
              role = 'admin',
              is_active = 1
          WHERE id = :id
        `,
        {
          id: existingRows[0].id,
          name: 'Pamoja Local Platform Admin',
          passwordHash
        }
      );
    } else {
      await connection.execute(
        `
          INSERT INTO users (name, email, password_hash, role, is_active)
          VALUES (:name, :email, :passwordHash, 'admin', 1)
        `,
        {
          name: 'Pamoja Local Platform Admin',
          email,
          passwordHash
        }
      );
    }

    await connection.commit();
    console.log(`Local platform-admin account ready: ${email}`);
    console.log('Password is supplied only through PLATFORM_ADMIN_PASSWORD and is never logged.');
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};

seedPlatformAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
