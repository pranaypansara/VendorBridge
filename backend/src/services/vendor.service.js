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

  const result = await vendorRepository.create({
    company_name: company_name.trim(),
    gst_number: gst_number.trim(),
    category: category.trim(),
    contact_person: contact_person.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    status
  });
  await activityLogRepository.create(userId, 'Vendor Created', `${company_name} was added to the vendor directory.`);
  return result;
}

async function update(id, payload, userId) {
  const result = await vendorRepository.update(id, payload);
  if (!result.rows.length) {
    const error = new Error('Vendor not found.');
    error.status = 404;
    throw error;
  }
  await activityLogRepository.create(userId, 'Vendor Updated', `${result.rows[0].company_name} was updated.`);
  return result;
}

module.exports = { list, create, update };
