const purchaseOrderService = require('../services/purchaseOrder.service');

async function list(req, res) {
  const result = await purchaseOrderService.list();
  res.json({ success: true, purchase_orders: result.rows });
}

module.exports = { list };
