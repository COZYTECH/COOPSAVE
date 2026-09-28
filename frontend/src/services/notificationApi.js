import { api } from '../lib/api';

export const notificationApi = {
  async list(params = {}) {
    const response = await api.get('/notifications', { params });
    return response.data.data.notifications;
  },

  async markRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data.data.notification;
  }
};
