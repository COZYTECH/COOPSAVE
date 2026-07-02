import { api } from '../lib/api';

export const memberApi = {
  async list() {
    const response = await api.get('/members');
    return response.data.data.members;
  },

  async create(payload) {
    const response = await api.post('/members', payload);
    return response.data.data.member;
  },

  async update(id, payload) {
    const response = await api.put(`/members/${id}`, payload);
    return response.data.data.member;
  },

  async remove(id) {
    const response = await api.delete(`/members/${id}`);
    return response.data;
  }
};
