const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Authentication status checker middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Check if database is configured
app.get('/api/db-status', (req, res) => {
  res.json({
    configured: db.isConfigured()
  });
});

// User Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { first_name, last_name, email, phone, password, role } = req.body;

  // Validate required inputs
  if (!first_name || !last_name || !email || !phone || !password || !role) {
    return res.status(400).json({ success: false, message: 'All registration fields are required.' });
  }

  // Validate role matches database constraints
  const allowedRoles = ['Admin', 'Procurement Officer', 'Manager', 'Vendor'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role selection.' });
  }

  // Check if database is configured
  if (!db.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'database_not_configured',
      message: 'Database is not connected. Please add your Neon PostgreSQL connection string to the .env file.'
    });
  }

  try {
    // Check if user already exists
    const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into Neon database
    const insertResult = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, role`,
      [
        first_name.trim(),
        last_name.trim(),
        email.toLowerCase().trim(),
        phone.trim(),
        passwordHash,
        role
      ]
    );

    const newUser = insertResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, first_name: newUser.first_name, last_name: newUser.last_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ success: false, message: 'Database registration failed. Ensure the users table has been created.' });
  }
});

// User Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password, persist } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please enter both username (email) and password.' });
  }

  // Check if database is configured
  if (!db.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'database_not_configured',
      message: 'Database is not connected. Please add your Neon PostgreSQL connection string to the .env file.'
    });
  }

  try {
    // Find user by email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [username.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    const user = result.rows[0];

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Determine cookie duration
    const cookieAge = persist ? 24 * 60 * 60 * 1000 : undefined; // 24 hours or Session

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: cookieAge
    });

    return res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ success: false, message: 'Database login validation failed.' });
  }
});

// Check current user session status
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Catch-all route to serve the login page or main index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start express server
app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `🚀 VendorBridge Server listening on http://localhost:${PORT}`);
});
