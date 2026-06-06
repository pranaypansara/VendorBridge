const { toNumber } = require('../utils/number');
const { invoiceNumber } = require('../utils/identifiers');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const invoiceRepository = require('../repositories/invoice.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

function list() {
  return invoiceRepository.list();
}

async function generate(poNumber, userId) {
  const po = await purchaseOrderRepository.findByNumber(poNumber);
  if (!po.rows.length) {
    const error = new Error('Purchase order not found.');
    error.status = 404;
    throw error;
  }

  const subtotal = toNumber(po.rows[0].amount);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const result = await invoiceRepository.create({
    invoice_number: invoiceNumber(),
    purchase_order_id: po.rows[0].id,
    subtotal,
    cgst,
    sgst,
    grand_total: subtotal + cgst + sgst
  });
  await activityLogRepository.create(userId, 'Invoice Generated', `${result.rows[0].invoice_number} was generated for ${poNumber}.`);
  return result.rows[0];
}

async function email(invoiceNumber, userId) {
  await activityLogRepository.create(userId, 'Invoice Emailed', `${invoiceNumber} was queued for email delivery.`);
  return { message: 'Invoice email queued. Configure SMTP for live delivery.' };
}

async function findByNumber(invoiceNumber) {
  return invoiceRepository.findByNumber(invoiceNumber);
}

async function updateStatus(invoiceId, status, userId) {
  const allowedStatuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Void'];
  if (!allowedStatuses.includes(status)) {
    const error = new Error(`Invalid invoice status. Allowed: ${allowedStatuses.join(', ')}`);
    error.status = 400;
    throw error;
  }
  const result = await invoiceRepository.updateStatus(invoiceId, status);
  if (!result.rows.length) {
    const error = new Error('Invoice not found.');
    error.status = 404;
    throw error;
  }
  await activityLogRepository.create(userId, 'Invoice Updated', `${result.rows[0].invoice_number} status changed to ${status}.`);
  return result;
}

module.exports = { list, generate, email, updateStatus, findByNumber };
