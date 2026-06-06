const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const reportController = require('../controllers/report.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRoles } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/', authenticateToken, requireRoles('Admin', 'Manager', 'Procurement Officer'), asyncHandler(reportController.getReports));

module.exports = router;
