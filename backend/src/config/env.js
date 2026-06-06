require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('FATAL: JWT_SECRET environment variable is required. Set it in .env or the environment.');
}

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL
};
