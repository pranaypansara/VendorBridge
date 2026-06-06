import { request } from './api';

export const invoiceService = {
  list: () => request('/api/invoices'),
  generate: (poNumber: string) => request(`/api/purchase-orders/${encodeURIComponent(poNumber)}/invoices`, { method: 'POST', body: JSON.stringify({}) }),
  email: (invoiceNumber: string) => request(`/api/invoices/${invoiceNumber}/email`, { method: 'POST', body: JSON.stringify({}) })
};
