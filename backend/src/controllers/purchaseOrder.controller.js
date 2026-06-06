const purchaseOrderService = require('../services/purchaseOrder.service');

async function list(req, res) {
  const result = await purchaseOrderService.list();
  res.json({ success: true, purchase_orders: result.rows });
}

async function updateStatus(req, res) {
  const result = await purchaseOrderService.updateStatus(req.params.poNumber, req.body.status, req.user.id);
  res.json({ success: true, purchase_order: result.rows[0] });
}

module.exports = { list, updateStatus };
