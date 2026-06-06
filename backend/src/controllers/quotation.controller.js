const quotationService = require('../services/quotation.service');

async function submit(req, res) {
  const quotation = await quotationService.submit(req.params.id, req.body, req.user);
  res.status(201).json({ success: true, quotation });
}

async function compare(req, res) {
  const result = await quotationService.compare(req.params.rfqId);
  res.json({ success: true, quotations: result.rows });
}

async function select(req, res) {
  const result = await quotationService.select(req.params.id, req.user.id);
  res.json({ success: true, quotation: result.rows[0] });
}

module.exports = { submit, compare, select };
