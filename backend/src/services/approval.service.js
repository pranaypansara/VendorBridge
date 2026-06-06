const db = require('../config/db');
const { poNumber } = require('../utils/identifiers');
const approvalRepository = require('../repositories/approval.repository');
const quotationRepository = require('../repositories/quotation.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const notificationRepository = require('../repositories/notification.repository');
const vendorRepository = require('../repositories/vendor.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

function list() {
  return approvalRepository.listQueue();
}

async function decide(payload, userId) {
  const { quotation_id, status, remarks } = payload;
  if (!quotation_id || !['Approved', 'Rejected'].includes(status)) {
    const error = new Error('Quotation and approval status are required.');
    error.status = 400;
    throw error;
  }

  const existingQuote = await quotationRepository.findById(quotation_id);
  if (!existingQuote.rows.length) {
    const error = new Error('Quotation not found.');
    error.status = 404;
    throw error;
  }
  if (existingQuote.rows[0].status !== 'Under Review') {
    const error = new Error('This quotation is not pending review. Only quotations under review can be approved or rejected.');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const approval = await approvalRepository.create(client, {
      quotation_id,
      approver_id: userId,
      remarks: remarks || '',
      status
    });
    const quote = await quotationRepository.updateStatus(quotation_id, status, client);
    await activityLogRepository.create(userId, `Approval ${status}`, `Quotation #${quotation_id} was ${status.toLowerCase()}.`, client);

    const vendorUser = await vendorRepository.findUserForVendor(quote.rows[0].vendor_id, client);
    const vendorUserId = vendorUser.rows[0] ? vendorUser.rows[0].id : null;

    if (status === 'Approved') {
      const number = poNumber();
      const poResult = await purchaseOrderRepository.create(client, {
        po_number: number,
        quotation_id: quote.rows[0].id,
        vendor_id: quote.rows[0].vendor_id,
        amount: quote.rows[0].total
      });
      const purchaseOrderId = poResult.rows[0].id;
      await quotationRepository.copyItemsToPurchaseOrder(client, purchaseOrderId, quotation_id);
      await activityLogRepository.create(userId, 'PO Generated', `${number} was generated from quotation #${quotation_id}.`, client);
      if (vendorUserId) {
        await notificationRepository.create(vendorUserId, `Purchase Order ${number} has been generated for your approved quotation.`, 'PO Generated', client);
      }
    }

    if (vendorUserId) {
      await notificationRepository.create(vendorUserId, `Your quotation #${quotation_id} has been ${status.toLowerCase()} by the approver.`, `Quotation ${status}`, client);
    }

    await client.query('COMMIT');
    return approval.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { list, decide };
