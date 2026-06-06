const dashboardService = require('../services/dashboard.service');

async function summary(req, res) {
  const result = await dashboardService.summary();
  res.json({ success: true, ...result });
}

module.exports = { summary };
