const activityLogRepository = require('../repositories/activityLog.repository');

function list() {
  return activityLogRepository.listRecent();
}

module.exports = { list };
