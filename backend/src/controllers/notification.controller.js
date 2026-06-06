const notificationService = require('../services/notification.service');

async function list(req, res) {
  const result = await notificationService.listForUser(req.user.id);
  res.json({ success: true, notifications: result.rows });
}

module.exports = { list };
