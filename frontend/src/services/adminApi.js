import { api } from '../lib/api';

export const adminApi = {
  async paymentIdentities() {
    const response = await api.get('/admin/payment-identities');
    return response.data.data.paymentIdentities;
  },

  async payouts() {
    const response = await api.get('/admin/payouts');
    return response.data.data.payouts;
  },

  async transactions() {
    const response = await api.get('/admin/payment-transactions');
    return response.data.data.transactions;
  },

  async financialAccounts(params = {}) {
    const response = await api.get('/admin/financial-accounts', { params });
    return response.data.data;
  },

  async financialAccount(groupId, params = {}) {
    const response = await api.get(`/admin/financial-accounts/${groupId}`, { params });
    return response.data.data;
  },

  async financialAccountCycle(groupId, cycleId, params = {}) {
    const response = await api.get(`/admin/financial-accounts/${groupId}/cycles/${cycleId}`, { params });
    return response.data.data;
  }
};
