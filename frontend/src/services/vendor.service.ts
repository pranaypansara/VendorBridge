import { request } from './api';

export const vendorService = {
  list: () => request('/api/vendors'),
  create: (payload: unknown) => request('/api/vendors', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number | string, payload: unknown) => request(`/api/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
};
