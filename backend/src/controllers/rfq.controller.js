const rfqService = require('../services/rfq.service');

async function list(req, res) {
  const result = await rfqService.list(req.user);
  res.json({ success: true, rfqs: result.rows });
}

async function details(req, res) {
  const result = await rfqService.details(req.params.id);
  res.json({ success: true, ...result });
}

async function create(req, res) {
  const rfq = await rfqService.create(req.body, req.user);
  res.status(201).json({ success: true, rfq });
}

async function updateStatus(req, res) {
  const rfq = await rfqService.updateStatus(req.params.id, req.body.status, req.user.id);
  res.json({ success: true, rfq });
}

module.exports = { list, details, create, updateStatus };
