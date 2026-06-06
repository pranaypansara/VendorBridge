const db = require('../config/db');

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'database_not_configured',
        message: 'Database is not connected. Please add your Neon PostgreSQL connection string to the .env file.'
      });
    }
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports = asyncHandler;
