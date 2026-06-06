const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./config/db');
const { errorMiddleware } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const vendorRoutes = require('./routes/vendor.routes');
const rfqRoutes = require('./routes/rfq.routes');
const quotationRoutes = require('./routes/quotation.routes');
const approvalRoutes = require('./routes/approval.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(frontendPath));

app.get('/api/db-status', (req, res) => {
  res.json({ configured: db.isConfigured() });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/reports', reportRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(errorMiddleware);

module.exports = app;
