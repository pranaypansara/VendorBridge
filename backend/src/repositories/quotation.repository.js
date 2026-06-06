const db = require('../config/db');

function count(where = 'TRUE') {
  return db.query(`SELECT COUNT(*)::int AS count FROM quotations WHERE ${where}`);
}

function create(client, quotation) {
  return client.query(
    `INSERT INTO quotations (rfq_id, vendor_id, subtotal, gst, total, delivery_days, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Submitted')
     RETURNING *`,
    [quotation.rfq_id, quotation.vendor_id, quotation.subtotal, quotation.gst, quotation.total, quotation.delivery_days, quotation.notes]
  );
}

function createItem(client, quotationId, item) {
  return client.query(
    `INSERT INTO quotation_items (quotation_id, item_name, quantity, unit_price, total_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [quotationId, item.item_name, item.quantity, item.unit_price, item.total_price]
  );
}

function compareByRfq(rfqId) {
  return db.query(
    `SELECT q.*, v.company_name, v.category,
            json_agg(json_build_object('item_name', qi.item_name, 'quantity', qi.quantity, 'unit_price', qi.unit_price, 'total_price', qi.total_price) ORDER BY qi.id) AS items
     FROM quotations q
     JOIN vendors v ON v.id = q.vendor_id
     LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
     WHERE q.rfq_id = $1
     GROUP BY q.id, v.company_name, v.category
     ORDER BY q.total ASC`,
    [rfqId]
  );
}

function updateStatus(id, status, client = db) {
  return client.query('UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
}

function copyItemsToPurchaseOrder(client, poNumber, quotationId) {
  return client.query(
    `INSERT INTO purchase_order_items (purchase_order_id, item_name, quantity, unit_price, total_price)
     SELECT $1, item_name, quantity, unit_price, total_price FROM quotation_items WHERE quotation_id = $2`,
    [poNumber, quotationId]
  );
}

module.exports = { count, create, createItem, compareByRfq, updateStatus, copyItemsToPurchaseOrder };
