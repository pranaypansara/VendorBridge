import { request } from './api';

export const quotationService = {
  submit: (rfqId: number | string, payload: unknown) => request(`/api/rfqs/${rfqId}/quotations`, { method: 'POST', body: JSON.stringify(payload) }),
  compare: (rfqId: number | string) => request(`/api/quotations/compare/${rfqId}`),
  select: (id: number | string) => request(`/api/quotations/${id}/select`, { method: 'POST', body: JSON.stringify({}) })
};
