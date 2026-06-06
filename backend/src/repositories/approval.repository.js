const db = require('../config/db');

function count() {
  return db.query('SELECT COUNT(*)::int AS count FROM approvals');
}

function listQueue() {
  return db.query(
    `SELECT a.id,
            a.quotation_id,
            a.remarks,
            a.status,
            a.approved_at,
            a.created_at,
            u.first_name || ' ' || u.last_name AS approver_name,
            q.total,
            q.status AS quotation_status,
            r.title AS rfq_title,
            v.company_name
     FROM approvals a
     JOIN quotations q ON q.id = a.quotation_id
     JOIN users u ON u.id = a.approver_id
     JOIN rfqs r ON r.id = q.rfq_id
     JOIN vendors v ON v.id = q.vendor_id
     ORDER BY a.created_at DESC`
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
