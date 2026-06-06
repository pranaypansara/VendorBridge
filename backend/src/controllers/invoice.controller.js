const invoiceService = require('../services/invoice.service');

async function list(req, res) {
  const result = await invoiceService.list();
  res.json({ success: true, invoices: result.rows });
}

async function generate(req, res) {
  const invoice = await invoiceService.generate(req.params.poNumber, req.user.id);
  res.status(201).json({ success: true, invoice });
}

async function email(req, res) {
  const result = await invoiceService.email(req.params.invoiceNumber, req.user.id);
  res.json({ success: true, message: result.message });
}

module.exports = { list, generate, email };
