const db = require('../config/db');

function findByEmail(email) {
  return db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
}

function create(user) {
  return db.query(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, first_name, last_name, email, role`,
    [user.first_name, user.last_name, user.email, user.phone, user.password_hash, user.role]
  );
}

function findManagers() {
  return db.query("SELECT id FROM users WHERE role = 'Manager'");
}

function findById(id) {
  return db.query('SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = $1', [id]);
}

module.exports = { findByEmail, create, findManagers, findById };
