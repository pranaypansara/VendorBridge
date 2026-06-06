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

const requireRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  next();
};

const asyncHandler = (handler) => async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'database_not_configured',
        message: 'Database is not connected. Please add your Neon PostgreSQL connection string to the .env file.'
      });
    }
    await handler(req, res);
  } catch (error) {
    console.error('ERP API Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Request failed.' });
  }
};

const toNumber = (value) => Number.parseFloat(value || 0);
const asArray = (value) => Array.isArray(value) ? value : [];
const poNumber = () => `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
const invoiceNumber = () => `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

async function logActivity(userId, action, details) {
  await db.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [userId || null, action, details || '']);
}

async function notifyUser(userId, message, type) {
  if (!userId) return;
  await db.query('INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)', [userId, message, type]);
}

async function tableCount(tableName, where = 'TRUE') {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ${tableName} WHERE ${where}`);
  return result.rows[0].count;
}

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

app.get('/api/dashboard/summary', authenticateToken, asyncHandler(async (req, res) => {
  const [
    vendors,
    activeVendors,
    rfqs,
    quotations,
    approvals,
    purchaseOrders,
    invoices,
    activity
  ] = await Promise.all([
    tableCount('vendors'),
    tableCount('vendors', "status = 'Active'"),
    tableCount('rfqs'),
    tableCount('quotations'),
    tableCount('approvals'),
    tableCount('purchase_orders'),
    tableCount('invoices'),
    db.query('SELECT id, action, details, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 8')
  ]);

  res.json({
    success: true,
    summary: { vendors, activeVendors, rfqs, quotations, approvals, purchaseOrders, invoices },
    activity: activity.rows
  });
}));

app.get('/api/vendors', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM vendors ORDER BY created_at DESC, id DESC');
  res.json({ success: true, vendors: result.rows });
}));

app.post('/api/vendors', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const { company_name, gst_number, category, contact_person, email, phone, status = 'Active' } = req.body;
  if (!company_name || !gst_number || !category || !contact_person || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Company, GST, category, contact, email, and phone are required.' });
  }

  const result = await db.query(
    `INSERT INTO vendors (company_name, gst_number, category, contact_person, email, phone, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [company_name.trim(), gst_number.trim(), category.trim(), contact_person.trim(), email.toLowerCase().trim(), phone.trim(), status]
  );
  await logActivity(req.user.id, 'Vendor Created', `${company_name} was added to the vendor directory.`);
  res.status(201).json({ success: true, vendor: result.rows[0] });
}));

app.patch('/api/vendors/:id', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const { company_name, gst_number, category, contact_person, email, phone, status } = req.body;
  const result = await db.query(
    `UPDATE vendors
     SET company_name = COALESCE($1, company_name),
         gst_number = COALESCE($2, gst_number),
         category = COALESCE($3, category),
         contact_person = COALESCE($4, contact_person),
         email = COALESCE($5, email),
         phone = COALESCE($6, phone),
         status = COALESCE($7, status)
     WHERE id = $8
     RETURNING *`,
    [company_name, gst_number, category, contact_person, email, phone, status, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  await logActivity(req.user.id, 'Vendor Updated', `${result.rows[0].company_name} was updated.`);
  res.json({ success: true, vendor: result.rows[0] });
}));

app.get('/api/rfqs', authenticateToken, asyncHandler(async (req, res) => {
  const vendorJoin = req.user.role === 'Vendor'
    ? `JOIN rfq_vendors rv ON rv.rfq_id = r.id
       JOIN vendors v ON v.id = rv.vendor_id AND LOWER(v.email) = LOWER($1)`
    : '';
  const params = req.user.role === 'Vendor' ? [req.user.email] : [];
  const result = await db.query(
    `SELECT r.*,
            u.first_name || ' ' || u.last_name AS creator_name,
            COUNT(DISTINCT ri.id)::int AS item_count,
            COUNT(DISTINCT q.id)::int AS quotation_count
     FROM rfqs r
     JOIN users u ON u.id = r.created_by
     LEFT JOIN rfq_items ri ON ri.rfq_id = r.id
     LEFT JOIN quotations q ON q.rfq_id = r.id
     ${vendorJoin}
     GROUP BY r.id, u.first_name, u.last_name
     ORDER BY r.created_at DESC`,
    params
  );
  res.json({ success: true, rfqs: result.rows });
}));

app.get('/api/rfqs/:id', authenticateToken, asyncHandler(async (req, res) => {
  const rfq = await db.query('SELECT * FROM rfqs WHERE id = $1', [req.params.id]);
  if (!rfq.rows.length) return res.status(404).json({ success: false, message: 'RFQ not found.' });
  const [items, vendors, quotations] = await Promise.all([
    db.query('SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY id', [req.params.id]),
    db.query(`SELECT v.* FROM vendors v JOIN rfq_vendors rv ON rv.vendor_id = v.id WHERE rv.rfq_id = $1 ORDER BY v.company_name`, [req.params.id]),
    db.query(`SELECT q.*, v.company_name FROM quotations q JOIN vendors v ON v.id = q.vendor_id WHERE q.rfq_id = $1 ORDER BY q.total ASC`, [req.params.id])
  ]);
  res.json({ success: true, rfq: rfq.rows[0], items: items.rows, vendors: vendors.rows, quotations: quotations.rows });
}));

app.post('/api/rfqs', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const { title, category, description, deadline, status = 'Published', items, vendor_ids } = req.body;
  if (!title || !category || !deadline || !asArray(items).length) {
    return res.status(400).json({ success: false, message: 'Title, category, deadline, and at least one line item are required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const rfqResult = await client.query(
      `INSERT INTO rfqs (title, category, description, deadline, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title.trim(), category.trim(), description || '', deadline, status, req.user.id]
    );
    const rfq = rfqResult.rows[0];

    for (const item of asArray(items)) {
      if (item.item_name && Number(item.quantity) > 0) {
        await client.query('INSERT INTO rfq_items (rfq_id, item_name, quantity) VALUES ($1, $2, $3)', [rfq.id, item.item_name.trim(), Number(item.quantity)]);
      }
    }

    for (const vendorId of asArray(vendor_ids)) {
      await client.query('INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rfq.id, vendorId]);
      const vendorUser = await client.query(
        `SELECT u.id FROM users u JOIN vendors v ON LOWER(v.email) = LOWER(u.email) WHERE v.id = $1 LIMIT 1`,
        [vendorId]
      );
      if (vendorUser.rows[0]) {
        await client.query('INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)', [vendorUser.rows[0].id, `You were assigned to RFQ ${rfq.title}.`, 'Vendor Assigned To RFQ']);
      }
    }

    await client.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [req.user.id, 'RFQ Created', `${title} was created and assigned to ${asArray(vendor_ids).length} vendors.`]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, rfq });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.post('/api/rfqs/:id/quotations', authenticateToken, requireRoles('Admin', 'Vendor'), asyncHandler(async (req, res) => {
  const { vendor_id, delivery_days, notes, items } = req.body;
  const vendorResult = vendor_id
    ? await db.query('SELECT * FROM vendors WHERE id = $1', [vendor_id])
    : await db.query('SELECT * FROM vendors WHERE LOWER(email) = LOWER($1) LIMIT 1', [req.user.email]);
  if (!vendorResult.rows.length) return res.status(400).json({ success: false, message: 'A matching vendor profile is required to submit a quotation.' });
  if (!asArray(items).length || !delivery_days) return res.status(400).json({ success: false, message: 'Delivery days and quotation line prices are required.' });

  const vendor = vendorResult.rows[0];
  const subtotal = asArray(items).reduce((sum, item) => sum + (Number(item.quantity) * toNumber(item.unit_price)), 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const quoteResult = await client.query(
      `INSERT INTO quotations (rfq_id, vendor_id, subtotal, gst, total, delivery_days, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Submitted')
       RETURNING *`,
      [req.params.id, vendor.id, subtotal, gst, total, Number(delivery_days), notes || '']
    );
    const quote = quoteResult.rows[0];
    for (const item of asArray(items)) {
      const quantity = Number(item.quantity);
      const unitPrice = toNumber(item.unit_price);
      await client.query(
        `INSERT INTO quotation_items (quotation_id, item_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [quote.id, item.item_name, quantity, unitPrice, quantity * unitPrice]
      );
    }
    await client.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [req.user.id, 'Quotation Submitted', `${vendor.company_name} submitted a quotation for RFQ #${req.params.id}.`]);
    const managers = await client.query("SELECT id FROM users WHERE role = 'Manager'");
    for (const manager of managers.rows) {
      await client.query('INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)', [manager.id, `Approval review available for quotation #${quote.id}.`, 'Approval Required']);
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, quotation: quote });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/quotations/compare/:rfqId', authenticateToken, requireRoles('Admin', 'Procurement Officer', 'Manager'), asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT q.*, v.company_name, v.category,
            json_agg(json_build_object('item_name', qi.item_name, 'quantity', qi.quantity, 'unit_price', qi.unit_price, 'total_price', qi.total_price) ORDER BY qi.id) AS items
     FROM quotations q
     JOIN vendors v ON v.id = q.vendor_id
     LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
     WHERE q.rfq_id = $1
     GROUP BY q.id, v.company_name, v.category
     ORDER BY q.total ASC`,
    [req.params.rfqId]
  );
  res.json({ success: true, quotations: result.rows });
}));

app.post('/api/quotations/:id/select', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const quote = await db.query('UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *', ['Under Review', req.params.id]);
  if (!quote.rows.length) return res.status(404).json({ success: false, message: 'Quotation not found.' });
  const managers = await db.query("SELECT id FROM users WHERE role = 'Manager'");
  for (const manager of managers.rows) {
    await notifyUser(manager.id, `Quotation #${req.params.id} is ready for approval.`, 'Approval Required');
  }
  await logActivity(req.user.id, 'Quotation Selected', `Quotation #${req.params.id} was selected for manager approval.`);
  res.json({ success: true, quotation: quote.rows[0] });
}));

app.get('/api/approvals', authenticateToken, requireRoles('Admin', 'Manager'), asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT q.*, r.title AS rfq_title, v.company_name
     FROM quotations q
     JOIN rfqs r ON r.id = q.rfq_id
     JOIN vendors v ON v.id = q.vendor_id
     WHERE q.status IN ('Under Review', 'Approved', 'Rejected')
     ORDER BY q.created_at DESC`
  );
  res.json({ success: true, approvals: result.rows });
}));

app.post('/api/approvals', authenticateToken, requireRoles('Admin', 'Manager'), asyncHandler(async (req, res) => {
  const { quotation_id, status, remarks } = req.body;
  if (!quotation_id || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Quotation and approval status are required.' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const approval = await client.query(
      `INSERT INTO approvals (quotation_id, approver_id, remarks, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [quotation_id, req.user.id, remarks || '', status]
    );
    const quote = await client.query('UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *', [status, quotation_id]);
    await client.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [req.user.id, `Approval ${status}`, `Quotation #${quotation_id} was ${status.toLowerCase()}.`]);
    if (status === 'Approved') {
      const number = poNumber();
      await client.query(
        `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, amount, status)
         VALUES ($1, $2, $3, $4, 'Issued')`,
        [number, quote.rows[0].id, quote.rows[0].vendor_id, quote.rows[0].total]
      );
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, item_name, quantity, unit_price, total_price)
         SELECT $1, item_name, quantity, unit_price, total_price FROM quotation_items WHERE quotation_id = $2`,
        [number, quotation_id]
      );
      await client.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)', [req.user.id, 'PO Generated', `${number} was generated from quotation #${quotation_id}.`]);
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, approval: approval.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/purchase-orders', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT po.*, v.company_name, r.title AS rfq_title
     FROM purchase_orders po
     JOIN vendors v ON v.id = po.vendor_id
     JOIN quotations q ON q.id = po.quotation_id
     JOIN rfqs r ON r.id = q.rfq_id
     ORDER BY po.created_at DESC`
  );
  res.json({ success: true, purchase_orders: result.rows });
}));

app.post('/api/purchase-orders/:poNumber/invoices', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const po = await db.query('SELECT * FROM purchase_orders WHERE po_number = $1', [req.params.poNumber]);
  if (!po.rows.length) return res.status(404).json({ success: false, message: 'Purchase order not found.' });
  const subtotal = toNumber(po.rows[0].amount);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotal = subtotal + cgst + sgst;
  const result = await db.query(
    `INSERT INTO invoices (invoice_number, purchase_order_id, subtotal, cgst, sgst, grand_total, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Sent')
     RETURNING *`,
    [invoiceNumber(), req.params.poNumber, subtotal, cgst, sgst, grandTotal]
  );
  await logActivity(req.user.id, 'Invoice Generated', `${result.rows[0].invoice_number} was generated for ${req.params.poNumber}.`);
  res.status(201).json({ success: true, invoice: result.rows[0] });
}));

app.get('/api/invoices', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT i.*, po.vendor_id, v.company_name
     FROM invoices i
     JOIN purchase_orders po ON po.po_number = i.purchase_order_id
     JOIN vendors v ON v.id = po.vendor_id
     ORDER BY i.created_at DESC`
  );
  res.json({ success: true, invoices: result.rows });
}));

app.post('/api/invoices/:invoiceNumber/email', authenticateToken, requireRoles('Admin', 'Procurement Officer'), asyncHandler(async (req, res) => {
  await logActivity(req.user.id, 'Invoice Emailed', `${req.params.invoiceNumber} was queued for email delivery.`);
  res.json({ success: true, message: 'Invoice email queued. Configure SMTP for live delivery.' });
}));

app.get('/api/activity-logs', authenticateToken, requireRoles('Admin', 'Manager'), asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT al.*, u.first_name, u.last_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT 100`
  );
  res.json({ success: true, logs: result.rows });
}));

app.get('/api/notifications', authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  res.json({ success: true, notifications: result.rows });
}));

app.get('/api/reports', authenticateToken, requireRoles('Admin', 'Manager', 'Procurement Officer'), asyncHandler(async (req, res) => {
  const [monthlySpend, categorySpend, topVendors, pendingApprovals, openRfqs] = await Promise.all([
    db.query(`SELECT TO_CHAR(created_at, 'Mon YYYY') AS month, SUM(amount)::numeric AS spend FROM purchase_orders GROUP BY 1 ORDER BY MIN(created_at)`),
    db.query(`SELECT r.category, SUM(po.amount)::numeric AS spend FROM purchase_orders po JOIN quotations q ON q.id = po.quotation_id JOIN rfqs r ON r.id = q.rfq_id GROUP BY r.category ORDER BY spend DESC`),
    db.query(`SELECT v.company_name, COUNT(po.po_number)::int AS orders, COALESCE(SUM(po.amount), 0)::numeric AS spend FROM vendors v LEFT JOIN purchase_orders po ON po.vendor_id = v.id GROUP BY v.id ORDER BY spend DESC LIMIT 8`),
    tableCount('quotations', "status = 'Under Review'"),
    tableCount('rfqs', "status IN ('Draft', 'Published', 'Under Evaluation')")
  ]);
  res.json({ success: true, reports: { monthlySpend: monthlySpend.rows, categorySpend: categorySpend.rows, topVendors: topVendors.rows, pendingApprovals, openRfqs } });
}));

// Catch-all route to serve the login page or main index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start express server
app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `🚀 VendorBridge Server listening on http://localhost:${PORT}`);
});
