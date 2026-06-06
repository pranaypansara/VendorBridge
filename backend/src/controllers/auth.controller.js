const authService = require('../services/auth.service');

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  ...(maxAge ? { maxAge } : {})
});

async function register(req, res) {
  const result = await authService.register(req.body);
  res.cookie('token', result.token, cookieOptions(24 * 60 * 60 * 1000));
  res.status(201).json({ success: true, message: 'Registration successful!', user: result.user });
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.cookie('token', result.token, cookieOptions(req.body.persist ? 24 * 60 * 60 * 1000 : undefined));
  res.json({ success: true, message: 'Login successful!', user: result.user });
}

async function me(req, res) {
  const user = await authService.me(req.user.id);
  res.json({ success: true, user });
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
}

module.exports = { register, login, me, logout };
