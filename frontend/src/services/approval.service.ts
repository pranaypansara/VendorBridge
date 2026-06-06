import { request } from './api';

export const approvalService = {
  list: () => request('/api/approvals'),
  decide: (payload: unknown) => request('/api/approvals', { method: 'POST', body: JSON.stringify(payload) })
};
