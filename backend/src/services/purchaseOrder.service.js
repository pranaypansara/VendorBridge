const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');

function list() {
  return purchaseOrderRepository.list();
}

module.exports = { list };
