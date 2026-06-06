const notificationRepository = require('../repositories/notification.repository');

function listForUser(userId) {
  return notificationRepository.listByUser(userId);
}

module.exports = { listForUser };
