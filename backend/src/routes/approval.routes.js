const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const approvalController = require('../controllers/approval.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();
const managerOnly = [authenticateToken, requireRoles('Admin', 'Manager')];

router.get('/', ...managerOnly, asyncHandler(approvalController.list));
router.post('/', ...managerOnly, asyncHandler(approvalController.decide));

module.exports = router;
