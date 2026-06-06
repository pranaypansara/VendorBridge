const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticateToken, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
