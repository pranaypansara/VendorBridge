const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

function list() {
  return purchaseOrderRepository.list();
}

async function updateStatus(poNumber, status, userId) {
  const allowedStatuses = ['Issued', 'Accepted', 'Completed', 'Cancelled'];
  if (!allowedStatuses.includes(status)) {
    const error = new Error(`Invalid PO status. Allowed: ${allowedStatuses.join(', ')}`);
    error.status = 400;
    throw error;
  }
  const result = await purchaseOrderRepository.updateStatus(poNumber, status);
  if (!result.rows.length) {
    const error = new Error('Purchase order not found.');
    error.status = 404;
    throw error;
  }
  await activityLogRepository.create(userId, 'PO Updated', `${poNumber} status changed to ${status}.`);
  return result;
}

module.exports = { list, updateStatus };
