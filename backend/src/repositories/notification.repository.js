const db = require('../config/db');

function create(userId, message, type, client = db) {
  if (!userId) return Promise.resolve();
  return client.query('INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)', [userId, message, type]);
}

function listByUser(userId) {
  return db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
}

module.exports = { create, listByUser };
