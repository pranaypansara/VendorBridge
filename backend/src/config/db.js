const { Pool } = require('pg');
const env = require('./env');

const dbUrl = env.databaseUrl;
const isPlaceholder = !dbUrl || dbUrl.includes('your-neon-host') || dbUrl.includes('postgresql://user');

let pool = null;
let isConfigured = false;

if (isPlaceholder) {
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: DATABASE_URL is not configured in .env. Database queries will fail.');
} else {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    isConfigured = true;

    pool.connect((err, client, release) => {
      if (err) {
        console.error('\x1b[31m%s\x1b[0m', 'Database connection failed. Please check your DATABASE_URL credentials in .env:');
        console.error(err.message);
      } else {
        console.log('\x1b[32m%s\x1b[0m', 'Database connection test successful. Neon PostgreSQL is connected.');
        release();
      }
    });
  } catch (error) {
    console.error('Failed to initialize PostgreSQL pool:', error);
  }
}

async function query(text, params) {
  if (!isConfigured || !pool) {
    throw new Error('Database is not configured. Please supply a valid DATABASE_URL in .env');
  }
  return pool.query(text, params);
}

module.exports = {
  query,
  isConfigured: () => isConfigured,
  pool
};
