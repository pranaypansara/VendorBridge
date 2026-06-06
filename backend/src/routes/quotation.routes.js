const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const quotationController = require('../controllers/quotation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/compare/:rfqId', authenticateToken, requireRoles('Admin', 'Procurement Officer', 'Manager'), asyncHandler(quotationController.compare));
router.post('/:id/select', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(quotationController.select));

module.exports = router;
