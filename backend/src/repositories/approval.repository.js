const db = require('../config/db');

function count() {
  return db.query('SELECT COUNT(*)::int AS count FROM approvals');
}

function listQueue() {
  return db.query(
    `SELECT q.*, r.title AS rfq_title, v.company_name
     FROM quotations q
     JOIN rfqs r ON r.id = q.rfq_id
     JOIN vendors v ON v.id = q.vendor_id
     WHERE q.status IN ('Under Review', 'Approved', 'Rejected')
     ORDER BY q.created_at DESC`
  );
}

function create(client, approval) {
  return client.query(
    `INSERT INTO approvals (quotation_id, approver_id, remarks, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [approval.quotation_id, approval.approver_id, approval.remarks, approval.status]
  );
}

module.exports = { count, listQueue, create };
