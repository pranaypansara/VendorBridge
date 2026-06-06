const activityLogService = require('../services/activityLog.service');

async function list(req, res) {
  const result = await activityLogService.list();
  res.json({ success: true, logs: result.rows });
}

module.exports = { list };
