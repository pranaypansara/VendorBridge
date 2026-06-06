const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/summary', authenticateToken, asyncHandler(dashboardController.summary));

module.exports = router;
