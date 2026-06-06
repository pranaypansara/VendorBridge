const vendorService = require('../services/vendor.service');

async function list(req, res) {
  const result = await vendorService.list();
  res.json({ success: true, vendors: result.rows });
}

async function create(req, res) {
  const result = await vendorService.create(req.body, req.user.id);
  res.status(201).json({ success: true, vendor: result.rows[0] });
}

async function update(req, res) {
  const result = await vendorService.update(req.params.id, req.body, req.user.id);
  res.json({ success: true, vendor: result.rows[0] });
}

module.exports = { list, create, update };
