const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const rfqController = require('../controllers/rfq.controller');
const quotationController = require('../controllers/quotation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(rfqController.list));
router.get('/:id', authenticateToken, asyncHandler(rfqController.details));
router.post('/', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(rfqController.create));
router.post('/:id/quotations', authenticateToken, requireRoles('Admin', 'Vendor'), asyncHandler(quotationController.submit));

module.exports = router;
