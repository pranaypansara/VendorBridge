const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const notificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(notificationController.list));

module.exports = router;
