import { request } from './api';

export const purchaseOrderService = {
  list: () => request('/api/purchase-orders')
};
