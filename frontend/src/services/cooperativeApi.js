import { api } from '../lib/api';

export const cooperativeApi = {
  async list() {
    const response = await api.get('/cooperatives');
    return response.data.data.cooperatives;
  },

  async create(payload) {
    const response = await api.post('/cooperatives', payload);
    return response.data.data.cooperative;
  },

  async update(id, payload) {
    const response = await api.put(`/cooperatives/${id}`, payload);
    return response.data.data.cooperative;
  },

  async remove(id) {
    const response = await api.delete(`/cooperatives/${id}`);
    return response.data;
  }
};
