const vendorRepository = require('../repositories/vendor.repository');
const rfqRepository = require('../repositories/rfq.repository');
const quotationRepository = require('../repositories/quotation.repository');
const approvalRepository = require('../repositories/approval.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const invoiceRepository = require('../repositories/invoice.repository');
const activityLogRepository = require('../repositories/activityLog.repository');

async function summary() {
  const [vendors, activeVendors, rfqs, quotations, approvals, purchaseOrders, invoices, activity] = await Promise.all([
    vendorRepository.count(),
    vendorRepository.count("status = 'Active'"),
    rfqRepository.count(),
    quotationRepository.count(),
    approvalRepository.count(),
    purchaseOrderRepository.count(),
    invoiceRepository.count(),
    activityLogRepository.dashboardRecent()
  ]);

  return {
    summary: {
      vendors: vendors.rows[0].count,
      activeVendors: activeVendors.rows[0].count,
      rfqs: rfqs.rows[0].count,
      quotations: quotations.rows[0].count,
      approvals: approvals.rows[0].count,
      purchaseOrders: purchaseOrders.rows[0].count,
      invoices: invoices.rows[0].count
    },
    activity: activity.rows
  };
}

module.exports = { summary };
