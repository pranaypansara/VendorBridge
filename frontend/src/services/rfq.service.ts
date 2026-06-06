import { request } from './api';

export const rfqService = {
  list: () => request('/api/rfqs'),
  details: (id: number | string) => request(`/api/rfqs/${id}`),
  create: (payload: unknown) => request('/api/rfqs', { method: 'POST', body: JSON.stringify(payload) })
};
