const db = require('../config/db');

function count(where = 'TRUE') {
  return db.query(`SELECT COUNT(*)::int AS count FROM rfqs WHERE ${where}`);
}

function list(user) {
  const vendorJoin = user.role === 'Vendor'
    ? `JOIN rfq_vendors rv ON rv.rfq_id = r.id
       JOIN vendors v ON v.id = rv.vendor_id AND LOWER(v.email) = LOWER($1)`
    : '';
  const params = user.role === 'Vendor' ? [user.email] : [];

  return db.query(
    `SELECT r.*,
            u.first_name || ' ' || u.last_name AS creator_name,
            COUNT(DISTINCT ri.id)::int AS item_count,
            COUNT(DISTINCT q.id)::int AS quotation_count
     FROM rfqs r
     JOIN users u ON u.id = r.created_by
     LEFT JOIN rfq_items ri ON ri.rfq_id = r.id
     LEFT JOIN quotations q ON q.rfq_id = r.id
     ${vendorJoin}
     GROUP BY r.id, u.first_name, u.last_name
     ORDER BY r.created_at DESC`,
    params
  );
}

function findById(id) {
  return db.query('SELECT * FROM rfqs WHERE id = $1', [id]);
}

function listItems(rfqId) {
  return db.query('SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY id', [rfqId]);
}

function listInvitedVendors(rfqId) {
  return db.query(
    `SELECT v.* FROM vendors v JOIN rfq_vendors rv ON rv.vendor_id = v.id WHERE rv.rfq_id = $1 ORDER BY v.company_name`,
    [rfqId]
  );
}

function listQuotations(rfqId) {
  return db.query(
    `SELECT q.*, v.company_name FROM quotations q JOIN vendors v ON v.id = q.vendor_id WHERE q.rfq_id = $1 ORDER BY q.total ASC`,
    [rfqId]
  );
}

function create(client, rfq) {
  return client.query(
    `INSERT INTO rfqs (title, category, description, deadline, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [rfq.title, rfq.category, rfq.description, rfq.deadline, rfq.status, rfq.created_by]
  );
}

function createItem(client, rfqId, item) {
  return client.query('INSERT INTO rfq_items (rfq_id, item_name, quantity) VALUES ($1, $2, $3)', [rfqId, item.item_name, item.quantity]);
}

function inviteVendor(client, rfqId, vendorId) {
  return client.query('INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rfqId, vendorId]);
}

module.exports = { count, list, findById, listItems, listInvitedVendors, listQuotations, create, createItem, inviteVendor };
