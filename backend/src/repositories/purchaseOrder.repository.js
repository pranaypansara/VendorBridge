const db = require('../config/db');

function count() {
  return db.query('SELECT COUNT(*)::int AS count FROM purchase_orders');
}

function create(client, purchaseOrder) {
  return client.query(
    `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, amount, status)
     VALUES ($1, $2, $3, $4, 'Issued')`,
    [purchaseOrder.po_number, purchaseOrder.quotation_id, purchaseOrder.vendor_id, purchaseOrder.amount]
  );
}

function list() {
  return db.query(
    `SELECT po.*, v.company_name, r.title AS rfq_title
     FROM purchase_orders po
     JOIN vendors v ON v.id = po.vendor_id
     JOIN quotations q ON q.id = po.quotation_id
     JOIN rfqs r ON r.id = q.rfq_id
     ORDER BY po.created_at DESC`
  );
}

function findByNumber(poNumber) {
  return db.query('SELECT * FROM purchase_orders WHERE po_number = $1', [poNumber]);
}

module.exports = { count, create, list, findByNumber };
