const reportRepository = require('../repositories/report.repository');
const quotationRepository = require('../repositories/quotation.repository');
const rfqRepository = require('../repositories/rfq.repository');

async function getReports() {
  const [monthlySpend, categorySpend, topVendors, pendingApprovals, openRfqs] = await Promise.all([
    reportRepository.monthlySpend(),
    reportRepository.categorySpend(),
    reportRepository.topVendors(),
    quotationRepository.count("status = 'Under Review'"),
    rfqRepository.count("status IN ('Draft', 'Published', 'Under Evaluation')")
  ]);

  return {
    monthlySpend: monthlySpend.rows,
    categorySpend: categorySpend.rows,
    topVendors: topVendors.rows,
    pendingApprovals: pendingApprovals.rows[0].count,
    openRfqs: openRfqs.rows[0].count
  };
}

module.exports = { getReports };
