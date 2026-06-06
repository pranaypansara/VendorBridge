const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = { authenticateToken };
