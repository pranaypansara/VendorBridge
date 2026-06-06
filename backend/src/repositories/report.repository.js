const db = require('../config/db');

function monthlySpend() {
  return db.query(`SELECT TO_CHAR(created_at, 'Mon YYYY') AS month, SUM(amount)::numeric AS spend FROM purchase_orders GROUP BY 1 ORDER BY MIN(created_at)`);
}

function categorySpend() {
  return db.query(`SELECT r.category, SUM(po.amount)::numeric AS spend FROM purchase_orders po JOIN quotations q ON q.id = po.quotation_id JOIN rfqs r ON r.id = q.rfq_id GROUP BY r.category ORDER BY spend DESC`);
}

function topVendors() {
  return db.query(`SELECT v.company_name, COUNT(po.id)::int AS orders, COALESCE(SUM(po.amount), 0)::numeric AS spend FROM vendors v LEFT JOIN purchase_orders po ON po.vendor_id = v.id GROUP BY v.id ORDER BY spend DESC LIMIT 8`);
}

module.exports = { monthlySpend, categorySpend, topVendors };
