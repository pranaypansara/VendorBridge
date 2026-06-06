const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const invoiceController = require('../controllers/invoice.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();
const procurementOnly = [authenticateToken, requireRoles('Admin', 'Procurement Officer')];

router.get('/', ...procurementOnly, asyncHandler(invoiceController.list));
router.patch('/:invoiceNumber/status', ...procurementOnly, asyncHandler(invoiceController.updateStatus));
router.post('/:invoiceNumber/email', ...procurementOnly, asyncHandler(invoiceController.email));

module.exports = router;
