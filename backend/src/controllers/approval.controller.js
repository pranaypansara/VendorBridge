const approvalService = require('../services/approval.service');

async function list(req, res) {
  const result = await approvalService.list();
  res.json({ success: true, approvals: result.rows });
}

async function decide(req, res) {
  const approval = await approvalService.decide(req.body, req.user.id);
  res.status(201).json({ success: true, approval });
}

module.exports = { list, decide };
