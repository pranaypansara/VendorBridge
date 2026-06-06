const state = {
  user: null,
  module: 'dashboard',
  vendors: [],
  rfqs: [],
  purchaseOrders: [],
  invoices: [],
  approvals: [],
  reports: null,
  logs: []
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', roles: ['Admin', 'Procurement Officer', 'Manager', 'Vendor'] },
  { id: 'vendors', label: 'Vendors', roles: ['Admin', 'Procurement Officer'] },
  { id: 'rfqs', label: 'RFQs', roles: ['Admin', 'Procurement Officer', 'Vendor'] },
  { id: 'quotations', label: 'Quotations', roles: ['Admin', 'Procurement Officer', 'Manager', 'Vendor'] },
  { id: 'approvals', label: 'Approvals', roles: ['Admin', 'Manager'] },
  { id: 'purchase-orders', label: 'Purchase Orders', roles: ['Admin', 'Procurement Officer'] },
  { id: 'invoices', label: 'Invoices', roles: ['Admin', 'Procurement Officer'] },
  { id: 'reports', label: 'Reports', roles: ['Admin', 'Procurement Officer', 'Manager'] },
  { id: 'activity', label: 'Activity Logs', roles: ['Admin', 'Manager'] }
];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const session = await api('/api/auth/me');
    state.user = session.user;
  } catch (error) {
    window.location.href = '/login.html';
    return;
  }

  hydrateUser();
  buildNav();
  bindChrome();
  await checkDb();
  await loadModule('dashboard');
  hideLoading();
}

function hydrateUser() {
  const fullName = `${state.user.first_name} ${state.user.last_name}`;
  text('user-display-name', fullName);
  text('user-display-role', state.user.role);
  text('user-avatar', `${state.user.first_name.charAt(0)}${state.user.last_name.charAt(0)}`.toUpperCase());
}

function buildNav() {
  const nav = document.getElementById('module-nav');
  nav.innerHTML = modules
    .filter((item) => item.roles.includes(state.user.role))
    .map((item) => `<button class="module-link" data-module="${item.id}" type="button">${item.label}</button>`)
    .join('');
  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-module]');
    if (button) loadModule(button.dataset.module);
  });
}

function bindChrome() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
  document.getElementById('refresh-btn').addEventListener('click', () => loadModule(state.module));
  document.getElementById('global-search').addEventListener('input', () => renderModule());
}

async function checkDb() {
  try {
    const db = await api('/api/db-status');
    const badge = document.getElementById('db-conn-badge');
    badge.textContent = db.configured ? 'Database Online' : 'Database Missing';
    badge.className = db.configured ? 'status-pill ok' : 'status-pill danger';
  } catch {
    text('db-conn-badge', 'Database Unknown');
  }
}

async function loadModule(moduleId) {
  state.module = moduleId;
  setActiveNav();
  showInlineLoading();

  try {
    if (moduleId === 'dashboard') state.dashboard = await api('/api/dashboard/summary');
    if (moduleId === 'vendors') state.vendors = (await api('/api/vendors')).vendors;
    if (moduleId === 'rfqs' || moduleId === 'quotations') {
      state.rfqs = (await api('/api/rfqs')).rfqs;
      if (canManage()) state.vendors = (await api('/api/vendors')).vendors;
    }
    if (moduleId === 'approvals') state.approvals = (await api('/api/approvals')).approvals;
    if (moduleId === 'purchase-orders') state.purchaseOrders = (await api('/api/purchase-orders')).purchase_orders;
    if (moduleId === 'invoices') {
      state.purchaseOrders = (await api('/api/purchase-orders')).purchase_orders;
      state.invoices = (await api('/api/invoices')).invoices;
    }
    if (moduleId === 'reports') state.reports = (await api('/api/reports')).reports;
    if (moduleId === 'activity') state.logs = (await api('/api/activity-logs')).logs;
    renderModule();
  } catch (error) {
    showAlert('error', error.message);
    renderError(error.message);
  }
}

function renderModule() {
  const renderers = {
    dashboard: renderDashboard,
    vendors: renderVendors,
    rfqs: renderRfqs,
    quotations: renderQuotations,
    approvals: renderApprovals,
    'purchase-orders': renderPurchaseOrders,
    invoices: renderInvoices,
    reports: renderReports,
    activity: renderActivity
  };
  renderers[state.module]();
}

function renderDashboard() {
  const s = state.dashboard?.summary || {};
  const activity = state.dashboard?.activity || [];
  workspace(`
    <div class="page-heading">
      <div>
        <p class="eyebrow">Procurement Control</p>
        <h1>Welcome back, ${escapeHtml(state.user.first_name)}</h1>
        <p>${roleCopy()}</p>
      </div>
    </div>
    <div class="metric-grid">
      ${metric('Vendors', s.vendors || 0, `${s.activeVendors || 0} active`)}
      ${metric('RFQs', s.rfqs || 0, 'Created requests')}
      ${metric('Quotations', s.quotations || 0, 'Vendor submissions')}
      ${metric('Approvals', s.approvals || 0, 'Manager decisions')}
      ${metric('Purchase Orders', s.purchaseOrders || 0, 'Generated from approvals')}
      ${metric('Invoices', s.invoices || 0, 'Generated from POs')}
    </div>
    <section class="panel">
      <div class="panel-title">Recent Activity</div>
      ${renderRows(activity, (log) => `
        <tr><td>${escapeHtml(log.action)}</td><td>${escapeHtml(log.details || '')}</td><td>${formatDate(log.created_at)}</td></tr>
      `, ['Action', 'Details', 'Time'])}
    </section>
  `);
}

function renderVendors() {
  const rows = filterRows(state.vendors, ['company_name', 'gst_number', 'category', 'contact_person', 'email', 'status']);
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">Vendor Directory</p><h1>Manage enterprise suppliers</h1></div>
    </div>
    <section class="split-layout">
      <form id="vendor-form" class="panel form-panel">
        <div class="panel-title">Create Vendor</div>
        ${input('company_name', 'Company Name')}
        ${input('gst_number', 'GST Number')}
        ${input('category', 'Category')}
        ${input('contact_person', 'Contact Person')}
        ${input('email', 'Email', 'email')}
        ${input('phone', 'Phone')}
        <button class="btn" type="submit">Add Vendor</button>
      </form>
      <section class="panel">
        <div class="panel-title">Vendors</div>
        ${renderRows(rows, (v) => `
          <tr>
            <td><strong>${escapeHtml(v.company_name)}</strong><span>${escapeHtml(v.contact_person)}</span></td>
            <td>${escapeHtml(v.category)}</td>
            <td>${escapeHtml(v.gst_number)}</td>
            <td><span class="status-dot">${escapeHtml(v.status)}</span></td>
            <td class="row-actions">
              <button class="mini-btn danger" data-vendor-delete="${v.id}" type="button">Delete</button>
            </td>
          </tr>`, ['Vendor', 'Category', 'GST', 'Status', 'Actions'])}
      </section>
    </section>
  `);
  document.getElementById('vendor-form').addEventListener('submit', submitVendor);
  document.querySelectorAll('[data-vendor-delete]').forEach((button) => button.addEventListener('click', deleteVendor));
}

function renderRfqs() {
  const rows = filterRows(state.rfqs, ['title', 'category', 'status', 'creator_name']);
  const statusOptions = ['Draft', 'Published', 'Under Evaluation', 'Completed', 'Cancelled'];
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">RFQ Workspace</p><h1>${state.user.role === 'Vendor' ? 'Assigned RFQs' : 'Create and manage RFQs'}</h1></div>
    </div>
    <section class="${canManage() ? 'split-layout' : ''}">
      ${canManage() ? rfqForm() : ''}
      <div class="panel">
        <div class="panel-title">RFQ Listing</div>
        ${renderRows(rows, (r) => `
          <tr>
            <td><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(r.category)}</span></td>
            <td>${formatDate(r.deadline)}</td>
            <td>${escapeHtml(r.status)}</td>
            <td>${r.item_count || 0} items / ${r.quotation_count || 0} quotes</td>
            ${canManage() ? `
            <td>
              <select class="status-select" data-rfq-status="${r.id}">
                ${statusOptions.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>` : ''}
          </tr>`, ['RFQ', 'Deadline', 'Status', 'Coverage'].concat(canManage() ? ['Update Status'] : []))}
      </div>
    </section>
  `);
  if (canManage()) {
    document.getElementById('rfq-form').addEventListener('submit', submitRfq);
    document.querySelectorAll('[data-rfq-status]').forEach((select) => select.addEventListener('change', updateRfqStatus));
  }
}

function renderQuotations() {
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">Quotations</p><h1>${state.user.role === 'Vendor' ? 'Submit quotation pricing' : 'Compare vendor quotations'}</h1></div>
    </div>
    <div class="panel-stack">
      ${state.rfqs.map((rfq) => state.user.role === 'Vendor' ? vendorQuotePanel(rfq) : comparisonPanel(rfq)).join('') || emptyState()}
    </div>
  `);
  document.querySelectorAll('[data-quote-rfq]').forEach((form) => form.addEventListener('submit', submitQuotation));
  document.querySelectorAll('[data-compare-rfq]').forEach((button) => button.addEventListener('click', loadComparison));
}

function renderApprovals() {
  const pendingItems = state.approvals.filter((q) => q.quotation_status === 'Under Review');
  const historyItems = state.approvals.filter((q) => q.quotation_status !== 'Under Review');
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">Approvals Hub</p><h1>Manager approval workflow</h1></div>
    </div>
    <section class="panel">
      <div class="panel-title">Pending Decisions</div>
      ${renderRows(pendingItems, (q) => `
        <tr>
          <td><strong>${escapeHtml(q.rfq_title)}</strong><span>${escapeHtml(q.company_name)}</span></td>
          <td>${money(q.total)}</td>
          <td class="row-actions">
            <button class="mini-btn" data-approve="${q.quotation_id}" data-status="Approved" type="button">Approve</button>
            <button class="mini-btn danger" data-approve="${q.quotation_id}" data-status="Rejected" type="button">Reject</button>
          </td>
        </tr>`, ['Quotation', 'Total', 'Action'])}
    </section>
    <section class="panel">
      <div class="panel-title">Approval History</div>
      ${renderRows(historyItems, (q) => `
        <tr>
          <td><strong>${escapeHtml(q.rfq_title)}</strong><span>${escapeHtml(q.company_name)}</span></td>
          <td>${money(q.total)}</td>
          <td>${escapeHtml(q.quotation_status)}</td>
          <td>${escapeHtml(q.approver_name || '-')}</td>
          <td>${formatDate(q.approved_at) || '-'}</td>
        </tr>`, ['Quotation', 'Total', 'Status', 'Approver', 'Decided At'])}
    </section>
  `);
  document.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', submitApproval));
}

function renderPurchaseOrders() {
  const poStatusOptions = ['Issued', 'Accepted', 'Completed', 'Cancelled'];
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">Purchase Orders</p><h1>Approved procurement commitments</h1></div>
    </div>
    <section class="panel">
      ${renderRows(state.purchaseOrders, (po) => `
        <tr>
          <td><strong>${escapeHtml(po.po_number)}</strong><span>${escapeHtml(po.rfq_title)}</span></td>
          <td>${escapeHtml(po.company_name)}</td>
          <td>${money(po.amount)}</td>
          <td>${escapeHtml(po.status)}</td>
          <td>
            <select class="status-select" data-po-status="${po.po_number}">
              ${poStatusOptions.map((s) => `<option value="${s}" ${s === po.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
        </tr>`, ['PO Number', 'Vendor', 'Amount', 'Status', 'Update'])}
    </section>
  `);
  document.querySelectorAll('[data-po-status]').forEach((select) => select.addEventListener('change', updatePoStatus));
}

async function updatePoStatus(event) {
  const poNumber = event.target.dataset.poStatus;
  const status = event.target.value;
  await submitJson(`/api/purchase-orders/${encodeURIComponent(poNumber)}/status`, { status }, `PO ${poNumber} status updated to ${status}.`);
  await loadModule('purchase-orders');
}

function renderInvoices() {
  const invStatusOptions = ['Draft', 'Sent', 'Paid', 'Overdue', 'Void'];
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">Invoices</p><h1>Generate, print, and email invoices</h1></div>
    </div>
    <section class="split-layout">
      <form id="invoice-form" class="panel form-panel">
        <div class="panel-title">Generate Invoice From PO</div>
        <label>Purchase Order<select name="po_number" required>${state.purchaseOrders.map((po) => `<option value="${po.po_number}">${po.po_number} - ${escapeHtml(po.company_name)}</option>`).join('')}</select></label>
        <button class="btn" type="submit">Generate Invoice</button>
      </form>
      <div class="panel">
        <div class="panel-title">Invoices</div>
        ${renderRows(state.invoices, (invoice) => `
          <tr>
            <td><strong>${escapeHtml(invoice.invoice_number)}</strong><span>${escapeHtml(invoice.company_name)}</span></td>
            <td>${escapeHtml(invoice.purchase_order_id)}</td>
            <td>${money(invoice.grand_total)}</td>
            <td>${escapeHtml(invoice.status)}</td>
            <td>
              <select class="status-select" data-inv-status="${invoice.invoice_number}">
                ${invStatusOptions.map((s) => `<option value="${s}" ${s === invoice.status ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
            <td class="row-actions">
              <button class="mini-btn" data-print="${invoice.invoice_number}" type="button">Print PDF</button>
              <button class="mini-btn" data-email="${invoice.invoice_number}" type="button">Email</button>
            </td>
          </tr>`, ['Invoice', 'PO', 'Total', 'Status', 'Update', 'Actions'])}
      </div>
    </section>
  `);
  document.getElementById('invoice-form').addEventListener('submit', submitInvoice);
  document.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => window.print()));
  document.querySelectorAll('[data-email]').forEach((button) => button.addEventListener('click', emailInvoice));
  document.querySelectorAll('[data-inv-status]').forEach((select) => select.addEventListener('change', updateInvoiceStatus));
}

async function updateInvoiceStatus(event) {
  const invNumber = event.target.dataset.invStatus;
  const status = event.target.value;
  await submitJson(`/api/invoices/${encodeURIComponent(invNumber)}/status`, { status }, `Invoice ${invNumber} status updated to ${status}.`);
  await loadModule('invoices');
}

function renderReports() {
  const reports = state.reports || {};
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">Reports & Analytics</p><h1>Procurement performance insights</h1></div>
    </div>
    <div class="metric-grid">
      ${metric('Pending Approvals', reports.pendingApprovals || 0, 'Need manager action')}
      ${metric('Open RFQs', reports.openRfqs || 0, 'Draft or active requests')}
      ${metric('Tracked Vendors', state.vendors.length || '-', 'Directory coverage')}
    </div>
    <section class="split-layout">
      <div class="panel">
        <div class="panel-title">Category Spend</div>
        ${barList(reports.categorySpend || [], 'category', 'spend')}
      </div>
      <div class="panel">
        <div class="panel-title">Top Vendors</div>
        ${renderRows(reports.topVendors || [], (v) => `<tr><td>${escapeHtml(v.company_name)}</td><td>${v.orders}</td><td>${money(v.spend)}</td></tr>`, ['Vendor', 'Orders', 'Spend'])}
      </div>
    </section>
  `);
}

function renderActivity() {
  workspace(`
    <div class="page-heading">
      <div><p class="eyebrow">System Audit Trail</p><h1>Activity tracking</h1></div>
    </div>
    <section class="panel">
      ${renderRows(state.logs, (log) => `
        <tr><td>${escapeHtml(log.action)}</td><td>${escapeHtml(log.details || '')}</td><td>${escapeHtml(`${log.first_name || 'System'} ${log.last_name || ''}`)}</td><td>${formatDate(log.created_at)}</td></tr>
      `, ['Action', 'Details', 'User', 'Time'])}
    </section>
  `);
}

function rfqForm() {
  return `
    <form id="rfq-form" class="panel form-panel">
      <div class="panel-title">Create RFQ</div>
      ${input('title', 'RFQ Title')}
      ${input('category', 'Category')}
      ${input('deadline', 'Submission Deadline', 'datetime-local')}
      <label>Description<textarea name="description" placeholder="Specifications, delivery expectations, terms..."></textarea></label>
      <label>Line Items<textarea name="items" required placeholder="Server Node,12&#10;Rack PDU,24"></textarea></label>
      <label>Assign Vendors<select name="vendor_ids" multiple required>${state.vendors.map((v) => `<option value="${v.id}">${escapeHtml(v.company_name)}</option>`).join('')}</select></label>
      <button class="btn" type="submit">Create RFQ</button>
    </form>`;
}

function vendorQuotePanel(rfq) {
  return `
    <form class="panel" data-quote-rfq="${rfq.id}">
      <div class="panel-title">${escapeHtml(rfq.title)}</div>
      <p class="muted">${escapeHtml(rfq.category)} · Deadline ${formatDate(rfq.deadline)}</p>
      <label>Delivery Days<input name="delivery_days" type="number" min="1" required></label>
      <label>Quoted Items<textarea name="items" required placeholder="Server Node,12,2450&#10;Rack PDU,24,185"></textarea></label>
      <label>Notes<textarea name="notes" placeholder="Payment terms, delivery notes, validity..."></textarea></label>
      <button class="btn" type="submit">Submit Quotation</button>
    </form>`;
}

function comparisonPanel(rfq) {
  return `
    <article class="panel">
      <div class="panel-row">
        <div><div class="panel-title">${escapeHtml(rfq.title)}</div><p class="muted">${rfq.quotation_count || 0} quotations received</p></div>
        <button class="mini-btn" data-compare-rfq="${rfq.id}" type="button">Load Comparison</button>
      </div>
      <div id="comparison-${rfq.id}" class="comparison-zone"></div>
    </article>`;
}

async function submitVendor(event) {
  event.preventDefault();
  await submitJson('/api/vendors', formData(event.target), 'Vendor created.');
  await loadModule('vendors');
}

async function deleteVendor(event) {
  const id = event.target.dataset.vendorDelete;
  if (!confirm('Are you sure you want to delete this vendor?')) return;
  await api(`/api/vendors/${id}`, { method: 'DELETE' });
  showAlert('success', 'Vendor deleted.');
  await loadModule('vendors');
}

async function submitRfq(event) {
  event.preventDefault();
  const data = formData(event.target);
  data.items = parseLines(data.items, ['item_name', 'quantity']);
  data.vendor_ids = Array.from(event.target.vendor_ids.selectedOptions).map((option) => Number(option.value));
  await submitJson('/api/rfqs', data, 'RFQ created and vendors notified.');
  await loadModule('rfqs');
}

async function updateRfqStatus(event) {
  const rfqId = event.target.dataset.rfqStatus;
  const status = event.target.value;
  await submitJson(`/api/rfqs/${rfqId}/status`, { status }, `RFQ status updated to ${status}.`);
  await loadModule('rfqs');
}

async function submitQuotation(event) {
  event.preventDefault();
  const data = formData(event.target);
  data.items = parseLines(data.items, ['item_name', 'quantity', 'unit_price']);
  await submitJson(`/api/rfqs/${event.target.dataset.quoteRfq}/quotations`, data, 'Quotation submitted.');
  await loadModule('quotations');
}

async function loadComparison(event) {
  const rfqId = event.target.dataset.compareRfq;
  const zone = document.getElementById(`comparison-${rfqId}`);
  zone.innerHTML = '<div class="muted">Loading comparison...</div>';
  const data = await api(`/api/quotations/compare/${rfqId}`);
  zone.innerHTML = renderRows(data.quotations, (q) => `
    <tr>
      <td><strong>${escapeHtml(q.company_name)}</strong><span>${q.delivery_days} delivery days</span></td>
      <td>${money(q.subtotal)}</td>
      <td>${money(q.gst)}</td>
      <td>${money(q.total)}</td>
      <td><button class="mini-btn" data-select-quote="${q.id}" type="button">Select Vendor</button></td>
    </tr>`, ['Vendor', 'Subtotal', 'GST', 'Total', 'Decision']);
  zone.querySelectorAll('[data-select-quote]').forEach((button) => button.addEventListener('click', selectQuote));
}

async function selectQuote(event) {
  await submitJson(`/api/quotations/${event.target.dataset.selectQuote}/select`, {}, 'Quotation selected for approval.');
  await loadModule('quotations');
}

async function submitApproval(event) {
  await submitJson('/api/approvals', {
    quotation_id: Number(event.target.dataset.approve),
    status: event.target.dataset.status,
    remarks: `${event.target.dataset.status} from approval hub`
  }, `Quotation ${event.target.dataset.status.toLowerCase()}.`);
  await loadModule('approvals');
}

async function submitInvoice(event) {
  event.preventDefault();
  const poNumber = event.target.po_number.value;
  await submitJson(`/api/purchase-orders/${encodeURIComponent(poNumber)}/invoices`, {}, 'Invoice generated.');
  await loadModule('invoices');
}

async function emailInvoice(event) {
  await submitJson(`/api/invoices/${event.target.dataset.email}/email`, {}, 'Invoice email queued.');
}

async function submitJson(url, data, successMessage) {
  const result = await api(url, { method: 'POST', body: JSON.stringify(data) });
  showAlert('success', result.message || successMessage);
  return result;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed.');
  return data;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function parseLines(value, keys) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(',').map((part) => part.trim());
    return keys.reduce((item, key, index) => {
      item[key] = ['quantity', 'unit_price'].includes(key) ? Number(parts[index]) : parts[index];
      return item;
    }, {});
  });
}

function renderRows(rows, rowRenderer, headers) {
  if (!rows || !rows.length) return emptyState();
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(rowRenderer).join('')}</tbody>
      </table>
    </div>`;
}

function filterRows(rows, keys) {
  const query = document.getElementById('global-search').value.toLowerCase().trim();
  if (!query) return rows;
  return rows.filter((row) => keys.some((key) => String(row[key] || '').toLowerCase().includes(query)));
}

function metric(label, value, detail) {
  return `<div class="metric-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;
}

function input(name, label, type = 'text') {
  return `<label>${label}<input name="${name}" type="${type}" required></label>`;
}

function barList(rows, labelKey, valueKey) {
  if (!rows.length) return emptyState();
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  return rows.map((row) => {
    const width = Math.max(8, (Number(row[valueKey]) / max) * 100);
    return `<div class="bar-row"><span>${escapeHtml(row[labelKey])}</span><div><i style="width:${width}%"></i></div><strong>${money(row[valueKey])}</strong></div>`;
  }).join('');
}

function emptyState() {
  return document.getElementById('empty-template').innerHTML;
}

function canManage() {
  return ['Admin', 'Procurement Officer'].includes(state.user.role);
}

function roleCopy() {
  const copy = {
    Admin: 'Full access to vendors, RFQs, approvals, audit activity, and reports.',
    'Procurement Officer': 'Create RFQs, assign vendors, compare quotations, generate POs, and invoice suppliers.',
    Manager: 'Review approvals, monitor reports, and inspect the audit trail.',
    Vendor: 'View assigned RFQs, submit quotations, and track your procurement status.'
  };
  return copy[state.user.role] || 'Procurement workspace';
}

function setActiveNav() {
  document.querySelectorAll('.module-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.module === state.module);
  });
}

function workspace(html) {
  document.getElementById('workspace').innerHTML = html;
}

function renderError(message) {
  workspace(`<div class="panel"><div class="empty-state"><strong>Unable to load module</strong><span>${escapeHtml(message)}</span></div></div>`);
}

function showInlineLoading() {
  workspace('<div class="panel"><div class="empty-state"><strong>Loading module</strong><span>Fetching current procurement data...</span></div></div>');
}

function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.style.opacity = '0';
  setTimeout(() => { loadingScreen.style.display = 'none'; }, 250);
}

function showAlert(type, message) {
  const container = document.getElementById('alert-container');
  container.innerHTML = `<div class="alert alert-${type}"><span>${escapeHtml(message)}</span></div>`;
  setTimeout(() => { container.innerHTML = ''; }, 4500);
}

function text(id, value) {
  document.getElementById(id).textContent = value;
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}
