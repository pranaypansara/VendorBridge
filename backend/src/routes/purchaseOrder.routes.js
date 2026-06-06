const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const purchaseOrderController = require('../controllers/purchaseOrder.controller');
const invoiceController = require('../controllers/invoice.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();
const procurementOnly = [authenticateToken, requireRoles('Admin', 'Procurement Officer')];

router.get('/', ...procurementOnly, asyncHandler(purchaseOrderController.list));
router.patch('/:poNumber/status', ...procurementOnly, asyncHandler(purchaseOrderController.updateStatus));
router.post('/:poNumber/invoices', ...procurementOnly, asyncHandler(invoiceController.generate));

module.exports = router;
