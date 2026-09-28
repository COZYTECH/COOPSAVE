import { api } from '../lib/api';

export const groupApi = {
  async get(groupId) {
    const response = await api.get(`/groups/${groupId}`);
    return response.data.data.group;
  },

  async members(groupId) {
    const response = await api.get(`/groups/${groupId}/manage/members`);
    return response.data.data.members;
  },

  async paymentIdentity(groupId) {
    const response = await api.get(`/groups/${groupId}/payment-identity`);
    return response.data.data.paymentIdentity;
  },

  async provisionPaymentIdentity(groupId) {
    const response = await api.post(`/groups/${groupId}/payment-identity/provision`);
    return response.data.data.paymentIdentity;
  },

  async paymentIdentities(groupId) {
    const response = await api.get(`/groups/${groupId}/manage/payment-identities`);
    return response.data.data.paymentIdentities;
  },

  async cycles(groupId) {
    const response = await api.get(`/groups/${groupId}/cycles`);
    return response.data.data.cycles;
  },

  async cycle(groupId, cycleId) {
    const response = await api.get(`/groups/${groupId}/cycles/${cycleId}`);
    return response.data.data.cycle;
  },

  async previewCycle(groupId, payload) {
    const response = await api.post(`/groups/${groupId}/cycles/preview`, payload);
    return response.data.data.preview;
  },

  async createCycle(groupId, payload) {
    const response = await api.post(`/groups/${groupId}/cycles`, payload);
    return response.data.data.cycle;
  },

  async startCycle(groupId, cycleId) {
    const response = await api.post(`/groups/${groupId}/cycles/${cycleId}/start`);
    return response.data.data.cycle;
  },

  async deleteCycle(groupId, cycleId) {
    const response = await api.delete(`/groups/${groupId}/cycles/${cycleId}`);
    return response.data.data;
  },

  async cancelCycle(groupId, cycleId) {
    const response = await api.patch(`/groups/${groupId}/cycles/${cycleId}/cancel`);
    return response.data.data.cycle;
  },

  async obligations(groupId) {
    const response = await api.get(`/groups/${groupId}/obligations`);
    return response.data.data.obligations;
  },

  async createCheckout(groupId, obligationId) {
    const response = await api.post(`/groups/${groupId}/obligations/${obligationId}/checkout`);
    return response.data.data.checkout;
  },

  async transactions(groupId) {
    const response = await api.get(`/groups/${groupId}/transactions`);
    return response.data.data.transactions;
  },

  async cycleObligations(groupId, cycleId) {
    const response = await api.get(`/groups/${groupId}/cycles/${cycleId}/obligations`);
    return response.data.data.obligations;
  },

  async myContributions(groupId) {
    const response = await api.get(`/me/ajo-contributions/${groupId}`);
    return response.data.data.obligations;
  },

  async myCycles(groupId) {
    const response = await api.get(`/me/ajo-cycles/${groupId}`);
    return response.data.data.cycles;
  },

  async myCycle(groupId, cycleId) {
    const response = await api.get(`/me/ajo-cycles/${groupId}/${cycleId}`);
    return response.data.data.cycle;
  },

  async myTransactions(groupId) {
    const response = await api.get(`/me/ajo-contributions/${groupId}/transactions`);
    return response.data.data.transactions;
  },

  async banks(country = 'NG') {
    const response = await api.get('/banks', { params: { country } });
    return response.data.data.banks;
  },

  async bankAccounts(groupId) {
    const response = await api.get(`/groups/${groupId}/bank-accounts`);
    return response.data.data.accounts;
  },

  async verifyBankAccount(groupId, payload) {
    const response = await api.post(`/groups/${groupId}/bank-accounts/verify`, payload);
    return response.data.data.account;
  },

  async payoutEligibility(groupId, cycleId) {
    const response = await api.get(`/groups/${groupId}/cycles/${cycleId}/payout-eligibility`);
    return response.data.data;
  },

  async payouts(groupId) {
    const response = await api.get(`/groups/${groupId}/payouts`);
    return response.data.data.payouts;
  },

  async createPayout(groupId, cycleId) {
    const response = await api.post(`/groups/${groupId}/cycles/${cycleId}/payouts`);
    return response.data.data.payout;
  },

  async retryPayout(groupId, payoutId) {
    const response = await api.post(`/groups/${groupId}/payouts/${payoutId}/retry`);
    return response.data.data.payout;
  },

  async myPayouts(groupId) {
    const response = await api.get(`/me/ajo-payouts/${groupId}`);
    return response.data.data.payouts;
  },

  async createInvitation(groupId, payload = {}) {
    const response = await api.post(`/cooperatives/${groupId}/invitations`, payload);
    return response.data.data.invitation;
  }
};
