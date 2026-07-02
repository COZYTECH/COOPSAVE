import { api } from '../lib/api';

export const reconciliationApi = {
  async get() {
    const response = await api.get('/reconciliation');
    return response.data.data;
  }
};
