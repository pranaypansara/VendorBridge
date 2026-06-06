# VendorBridge

Procurement & Vendor Management ERP

Built as a solo hackathon project.

## Overview

VendorBridge is a web application that digitizes the procurement process by connecting vendors, procurement officers, managers, purchase orders, invoices, notifications, and audit logs in a single system.

The application follows a structured procurement workflow and stores all business data in PostgreSQL.

---

## Architecture

### Frontend

* React
* TypeScript
* Tailwind CSS
* React Router

### Backend

* Node.js
* Express.js

### Database

* Neon PostgreSQL

### Authentication

* JWT
* bcrypt

---

## Database Design

The application uses a normalized PostgreSQL schema.

```text
users
vendors
rfqs
rfq_items
rfq_vendors
quotations
quotation_items
approvals
purchase_orders
purchase_order_items
invoices
notifications
activity_logs
```

### Relationship Flow

```text
users
 ├─ rfqs
 ├─ approvals
 ├─ notifications
 └─ activity_logs

vendors
 ├─ rfq_vendors
 ├─ quotations
 └─ purchase_orders

rfqs
 ├─ rfq_items
 ├─ rfq_vendors
 └─ quotations

quotations
 ├─ quotation_items
 ├─ approvals
 └─ purchase_orders

purchase_orders
 ├─ purchase_order_items
 └─ invoices
```

---

## Project Structure

```text
frontend/
backend/

frontend
 ├─ pages
 ├─ components
 ├─ services
 ├─ contexts
 └─ types

backend
 ├─ routes
 ├─ controllers
 ├─ services
 ├─ repositories
 ├─ middleware
 └─ config
```

Backend request flow:

```text
Route
→ Controller
→ Service
→ Repository
→ PostgreSQL
```

---

## Roles

### Admin

Full system access.

### Procurement Officer

Procurement operations and vendor management.

### Manager

Approval and reporting access.

### Vendor

Quotation submission and RFQ participation.

---

## Running Locally

```bash
npm run dev
or
npm start
```

### Environment Variables

```env
DATABASE_URL=
JWT_SECRET=
PORT=
```

---

## Notes

* Desktop-first UI
* Role-based access control
* PostgreSQL-backed workflow
* Audit logging through activity logs
* Notification system integrated into workflow

---

## Author

Pranay Pansara
