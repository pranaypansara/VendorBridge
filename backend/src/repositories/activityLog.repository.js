const db = require('../config/db');

function create(userId, action, details, client = db) {
  return client.query(
    'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
    [userId || null, action, details || '']
  );
}

function listRecent(limit = 100) {
  return db.query(
    `SELECT al.*, u.first_name, u.last_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
}

function dashboardRecent(limit = 8) {
  return db.query('SELECT id, action, details, created_at FROM activity_logs ORDER BY created_at DESC LIMIT $1', [limit]);
}

module.exports = { create, listRecent, dashboardRecent };
