const reportService = require('../services/report.service');

async function getReports(req, res) {
  const reports = await reportService.getReports();
  res.json({ success: true, reports });
}

module.exports = { getReports };
