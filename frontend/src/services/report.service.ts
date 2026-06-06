import { request } from './api';

export const reportService = {
  getReports: () => request('/api/reports')
};
