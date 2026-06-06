const db = require('../config/db');

function count(where = 'TRUE') {
  return db.query(`SELECT COUNT(*)::int AS count FROM vendors WHERE ${where}`);
}

function list() {
  return db.query('SELECT * FROM vendors ORDER BY created_at DESC, id DESC');
}

function create(vendor) {
  return db.query(
    `INSERT INTO vendors (company_name, gst_number, category, contact_person, email, phone, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [vendor.company_name, vendor.gst_number, vendor.category, vendor.contact_person, vendor.email, vendor.phone, vendor.status]
  );
}

function update(id, vendor) {
  return db.query(
    `UPDATE vendors
     SET company_name = COALESCE($1, company_name),
         gst_number = COALESCE($2, gst_number),
         category = COALESCE($3, category),
         contact_person = COALESCE($4, contact_person),
         email = COALESCE($5, email),
         phone = COALESCE($6, phone),
         status = COALESCE($7, status)
     WHERE id = $8
     RETURNING *`,
    [vendor.company_name, vendor.gst_number, vendor.category, vendor.contact_person, vendor.email, vendor.phone, vendor.status, id]
  );
}

function findById(id) {
  return db.query('SELECT * FROM vendors WHERE id = $1', [id]);
}

function findByUserEmail(email) {
  return db.query('SELECT * FROM vendors WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
}

function findUserForVendor(vendorId, client = db) {
  return client.query(
    `SELECT u.id FROM users u JOIN vendors v ON LOWER(v.email) = LOWER(u.email) WHERE v.id = $1 LIMIT 1`,
    [vendorId]
  );
}

module.exports = { count, list, create, update, findById, findByUserEmail, findUserForVendor };
