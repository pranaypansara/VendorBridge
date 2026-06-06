const db = require('../config/db');
const { asArray, toNumber } = require('../utils/number');
const quotationRepository = require('../repositories/quotation.repository');
const vendorRepository = require('../repositories/vendor.repository');
const userRepository = require('../repositories/user.repository');
const notificationRepository = require('../repositories/notification.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

async function submit(rfqId, payload, user) {
  const { vendor_id, delivery_days, notes, items } = payload;
  const vendorResult = vendor_id
    ? await vendorRepository.findById(vendor_id)
    : await vendorRepository.findByUserEmail(user.email);

  if (!vendorResult.rows.length) {
    const error = new Error('A matching vendor profile is required to submit a quotation.');
    error.status = 400;
    throw error;
  }
  if (!asArray(items).length || !delivery_days) {
    const error = new Error('Delivery days and quotation line prices are required.');
    error.status = 400;
    throw error;
  }

  const vendor = vendorResult.rows[0];
  const subtotal = asArray(items).reduce((sum, item) => sum + (Number(item.quantity) * toNumber(item.unit_price)), 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const quoteResult = await quotationRepository.create(client, {
      rfq_id: rfqId,
      vendor_id: vendor.id,
      subtotal,
      gst,
      total,
      delivery_days: Number(delivery_days),
      notes: notes || ''
    });
    const quote = quoteResult.rows[0];

    for (const item of asArray(items)) {
      const quantity = Number(item.quantity);
      const unitPrice = toNumber(item.unit_price);
      await quotationRepository.createItem(client, quote.id, {
        item_name: item.item_name,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice
      });
    }

    await activityLogRepository.create(user.id, 'Quotation Submitted', `${vendor.company_name} submitted a quotation for RFQ #${rfqId}.`, client);
    const managers = await userRepository.findManagers();
    for (const manager of managers.rows) {
      await notificationRepository.create(manager.id, `Approval review available for quotation #${quote.id}.`, 'Approval Required', client);
    }
    await client.query('COMMIT');
    return quote;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function compare(rfqId) {
  return quotationRepository.compareByRfq(rfqId);
}

async function select(id, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const quote = await quotationRepository.updateStatus(id, 'Under Review', client);
    if (!quote.rows.length) {
      await client.query('ROLLBACK');
      const error = new Error('Quotation not found.');
      error.status = 404;
      throw error;
    }
    const managers = await userRepository.findManagers();
    for (const manager of managers.rows) {
      await notificationRepository.create(manager.id, `Quotation #${id} is ready for approval.`, 'Approval Required', client);
    }
    await activityLogRepository.create(userId, 'Quotation Selected', `Quotation #${id} was selected for manager approval.`, client);
    const vendorUser = await vendorRepository.findUserForVendor(quote.rows[0].vendor_id, client);
    if (vendorUser.rows[0]) {
      await notificationRepository.create(vendorUser.rows[0].id, `Your quotation #${id} has been selected for manager review.`, 'Quotation Selected', client);
    }
    await client.query('COMMIT');
    return quote;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { submit, compare, select };
