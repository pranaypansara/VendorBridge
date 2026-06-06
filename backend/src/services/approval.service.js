const db = require('../config/db');
const { poNumber } = require('../utils/identifiers');
const approvalRepository = require('../repositories/approval.repository');
const quotationRepository = require('../repositories/quotation.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
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

    if (status === 'Approved') {
      const number = poNumber();
      await purchaseOrderRepository.create(client, {
        po_number: number,
        quotation_id: quote.rows[0].id,
        vendor_id: quote.rows[0].vendor_id,
        amount: quote.rows[0].total
      });
      await quotationRepository.copyItemsToPurchaseOrder(client, number, quotation_id);
      await activityLogRepository.create(userId, 'PO Generated', `${number} was generated from quotation #${quotation_id}.`, client);
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
