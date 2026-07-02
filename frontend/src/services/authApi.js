import { api } from '../lib/api';

export const authApi = {
  async register(payload) {
    const response = await api.post('/auth/register', payload);
    return response.data.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data.data;
  },

  async currentUser() {
    const response = await api.get('/auth/me');
    return response.data.data.user;
  }
};
