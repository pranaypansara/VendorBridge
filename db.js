const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
const isPlaceholder = !dbUrl || dbUrl.includes('your-neon-host') || dbUrl.includes('postgresql://user');

let pool = null;
let isConfigured = false;

if (isPlaceholder) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: DATABASE_URL is not configured in .env. Database queries will fail. Please add your Neon PostgreSQL connection string to the .env file.');
} else {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Required for Neon PostgreSQL serverless connections
      }
    });
    isConfigured = true;
    
    // Test connection on boot
    pool.connect((err, client, release) => {
      if (err) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Database connection failed. Please check your DATABASE_URL credentials in .env:');
        console.error(err.message);
      } else {
        console.log('\x1b[32m%s\x1b[0m', '✅ Database connection test successful! Neon PostgreSQL is connected.');
        release();
      }
    });
  } catch (error) {
    console.error('Failed to initialize PostgreSQL pool:', error);
  }
}

/**
 * Execute a query against the configured database
 * @param {string} text 
 * @param {Array} params 
 * @returns {Promise<import('pg').QueryResult>}
 */
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
