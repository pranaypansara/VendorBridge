const db = require('../config/db');
const vendorRepository = require('../repositories/vendor.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

function list() {
  return vendorRepository.list();
}

async function create(payload, userId) {
  const { company_name, gst_number, category, contact_person, email, phone, status = 'Active' } = payload;
  if (!company_name || !gst_number || !category || !contact_person || !email || !phone) {
    const error = new Error('Company, GST, category, contact, email, and phone are required.');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await vendorRepository.create({
      company_name: company_name.trim(),
      gst_number: gst_number.trim(),
      category: category.trim(),
      contact_person: contact_person.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      status
    }, client);
    await activityLogRepository.create(userId, 'Vendor Created', `${company_name} was added to the vendor directory.`, client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, payload, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await vendorRepository.update(id, payload, client);
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      const error = new Error('Vendor not found.');
      error.status = 404;
      throw error;
    }
    await activityLogRepository.create(userId, 'Vendor Updated', `${result.rows[0].company_name} was updated.`, client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function remove(id, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await vendorRepository.remove(id, client);
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      const error = new Error('Vendor not found.');
      error.status = 404;
      throw error;
    }
    await activityLogRepository.create(userId, 'Vendor Deleted', `${result.rows[0].company_name} was removed from the vendor directory.`, client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { list, create, update, remove };
