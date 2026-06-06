const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const vendorController = require('../controllers/vendor.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();
const manageVendors = [authenticateToken, requireRoles('Admin', 'Procurement Officer')];

router.get('/', ...manageVendors, asyncHandler(vendorController.list));
router.post('/', ...manageVendors, asyncHandler(vendorController.create));
router.patch('/:id', ...manageVendors, asyncHandler(vendorController.update));

module.exports = router;
