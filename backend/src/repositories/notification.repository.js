const db = require('../config/db');

function create(userId, message, title, client = db) {
  if (!userId) return Promise.resolve();
  return client.query('INSERT INTO notifications (user_id, message, title) VALUES ($1, $2, $3)', [userId, message, title]);
}

function listByUser(userId) {
  return db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
}

module.exports = { create, listByUser };
