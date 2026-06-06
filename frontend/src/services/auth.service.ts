import { request } from './api';

export const authService = {
  register: (payload: unknown) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: unknown) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' })
};
