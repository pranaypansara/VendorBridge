const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { allowedRoles } = require('../config/constants');
const userRepository = require('../repositories/user.repository');

function signUser(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    env.jwtSecret,
    { expiresIn: '24h' }
  );
}

async function register(payload) {
  const { first_name, last_name, email, phone, password, role } = payload;
  if (!first_name || !last_name || !email || !phone || !password || !role) {
    const error = new Error('All registration fields are required.');
    error.status = 400;
    throw error;
  }
  if (!allowedRoles.includes(role)) {
    const error = new Error('Invalid role selection.');
    error.status = 400;
    throw error;
  }

  const existing = await userRepository.findByEmail(email);
  if (existing.rows.length > 0) {
    const error = new Error('A user with this email address already exists.');
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
  const result = await userRepository.create({
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    password_hash: passwordHash,
    role
  });

  const user = result.rows[0];
  return { user, token: signUser(user) };
}

async function login(payload) {
  const { username, password } = payload;
  if (!username || !password) {
    const error = new Error('Please enter both username (email) and password.');
    error.status = 400;
    throw error;
  }

  const result = await userRepository.findByEmail(username);
  if (result.rows.length === 0) {
    const error = new Error('Incorrect email or password.');
    error.status = 401;
    throw error;
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Incorrect email or password.');
    error.status = 401;
    throw error;
  }

  return {
    token: signUser(user),
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role
    }
  };
}

async function me(userId) {
  const result = await userRepository.findById(userId);
  if (!result.rows.length) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

module.exports = { register, login, me };
