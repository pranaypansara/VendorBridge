const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const activityLogController = require('../controllers/activityLog.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/', authenticateToken, requireRoles('Admin', 'Manager'), asyncHandler(activityLogController.list));

module.exports = router;
