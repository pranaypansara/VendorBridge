function poNumber() {
  return `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function invoiceNumber() {
  return `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

module.exports = { poNumber, invoiceNumber };
