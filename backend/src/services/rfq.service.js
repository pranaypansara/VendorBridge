const db = require('../config/db');
const { asArray } = require('../utils/number');
const rfqRepository = require('../repositories/rfq.repository');
const vendorRepository = require('../repositories/vendor.repository');
const notificationRepository = require('../repositories/notification.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

function list(user) {
  return rfqRepository.list(user);
}

async function details(id) {
  const rfq = await rfqRepository.findById(id);
  if (!rfq.rows.length) {
    const error = new Error('RFQ not found.');
    error.status = 404;
    throw error;
  }

  const [items, vendors, quotations] = await Promise.all([
    rfqRepository.listItems(id),
    rfqRepository.listInvitedVendors(id),
    rfqRepository.listQuotations(id)
  ]);

  return { rfq: rfq.rows[0], items: items.rows, vendors: vendors.rows, quotations: quotations.rows };
}

async function create(payload, user) {
  const { title, category, description, deadline, status = 'Published', items, vendor_ids } = payload;
  if (!title || !category || !deadline || !asArray(items).length) {
    const error = new Error('Title, category, deadline, and at least one line item are required.');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const rfqResult = await rfqRepository.create(client, {
      title: title.trim(),
      category: category.trim(),
      description: description || '',
      deadline,
      status,
      created_by: user.id
    });
    const rfq = rfqResult.rows[0];

    for (const item of asArray(items)) {
      if (item.item_name && Number(item.quantity) > 0) {
        await rfqRepository.createItem(client, rfq.id, { item_name: item.item_name.trim(), quantity: Number(item.quantity) });
      }
    }

    for (const vendorId of asArray(vendor_ids)) {
      await rfqRepository.inviteVendor(client, rfq.id, vendorId);
      const vendorUser = await vendorRepository.findUserForVendor(vendorId, client);
      if (vendorUser.rows[0]) {
        await notificationRepository.create(vendorUser.rows[0].id, `You were assigned to RFQ ${rfq.title}.`, 'Vendor Assigned To RFQ', client);
      }
    }

    await activityLogRepository.create(user.id, 'RFQ Created', `${title} was created and assigned to ${asArray(vendor_ids).length} vendors.`, client);
    await client.query('COMMIT');
    return rfq;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { list, details, create };
