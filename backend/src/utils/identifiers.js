let poCounter = 0;
let invCounter = 0;
let lastPoReset = '';
let lastInvReset = '';

function poNumber() {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateKey !== lastPoReset) {
    poCounter = 0;
    lastPoReset = dateKey;
  }
  poCounter++;
  return `PO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(poCounter).padStart(4, '0')}`;
}

function invoiceNumber() {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateKey !== lastInvReset) {
    invCounter = 0;
    lastInvReset = dateKey;
  }
  invCounter++;
  return `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(invCounter).padStart(4, '0')}`;
}

module.exports = { poNumber, invoiceNumber };
