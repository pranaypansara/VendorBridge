require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL
};
