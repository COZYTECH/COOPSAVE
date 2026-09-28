import { api } from '../lib/api';

export const reconciliationApi = {
  async get() {
    const response = await api.get('/admin/reconciliation');
    return response.data.data;
  }
};
