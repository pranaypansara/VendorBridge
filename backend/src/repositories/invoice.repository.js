const db = require('../config/db');

function count() {
  return db.query('SELECT COUNT(*)::int AS count FROM invoices');
}

function create(invoice) {
  return db.query(
    `INSERT INTO invoices (invoice_number, purchase_order_id, subtotal, cgst, sgst, grand_total, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Draft')
     RETURNING *`,
    [invoice.invoice_number, invoice.purchase_order_id, invoice.subtotal, invoice.cgst, invoice.sgst, invoice.grand_total]
  );
}

function list() {
  return db.query(
    `SELECT i.*, po.vendor_id, v.company_name
     FROM invoices i
     JOIN purchase_orders po ON po.id = i.purchase_order_id
     JOIN vendors v ON v.id = po.vendor_id
     ORDER BY i.created_at DESC`
  );
}

function updateStatus(id, status) {
  return db.query('UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
}

function findByNumber(invoiceNumber) {
  return db.query('SELECT * FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
}

function findById(id) {
  return db.query('SELECT * FROM invoices WHERE id = $1', [id]);
}

module.exports = { count, create, list, updateStatus, findByNumber, findById };
