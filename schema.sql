-- ====================================================================
-- VendorBridge Database Schema Setup (PostgreSQL)
-- Phase 0 through Phase 3 Data Architecture
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Procurement Officer', 'Manager', 'Vendor')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Request For Quotations (RFQs) Table
CREATE TABLE IF NOT EXISTS rfqs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    deadline TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Under Evaluation', 'Completed', 'Cancelled')),
    created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. RFQ Line Items Table
CREATE TABLE IF NOT EXISTS rfq_items (
    id SERIAL PRIMARY KEY,
    rfq_id INT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
);

-- 5. RFQ invited Vendors Mapping Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS rfq_vendors (
    rfq_id INT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    PRIMARY KEY (rfq_id, vendor_id)
);

-- 6. Quotations Table (Vendor Submissions)
CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    rfq_id INT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    gst DECIMAL(12, 2) NOT NULL CHECK (gst >= 0),
    total DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
    delivery_days INT NOT NULL CHECK (delivery_days > 0),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Quotation Line Items Table (Pricing Details)
CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0)
);

-- 8. Approvals Table (Manager approvals)
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    quotation_id INT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    approver_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    remarks TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Approved', 'Rejected')),
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_number VARCHAR(100) PRIMARY KEY,
    quotation_id INT NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
    vendor_id INT NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Accepted', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Purchase Order Line Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id VARCHAR(100) NOT NULL REFERENCES purchase_orders(po_number) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0)
);

-- 11. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    invoice_number VARCHAR(100) PRIMARY KEY,
    purchase_order_id VARCHAR(100) NOT NULL REFERENCES purchase_orders(po_number) ON DELETE RESTRICT,
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    cgst DECIMAL(12, 2) NOT NULL CHECK (cgst >= 0),
    sgst DECIMAL(12, 2) NOT NULL CHECK (sgst >= 0),
    grand_total DECIMAL(12, 2) NOT NULL CHECK (grand_total >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Void')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL, -- e.g., 'New RFQ Assigned', 'Approval Required', 'Invoice Generated'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Activity Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- e.g., 'Vendor Created', 'RFQ Created', 'Quotation Submitted'
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
