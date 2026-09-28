import { api } from '../lib/api';

export const invitationApi = {
  async join(inviteCode) {
    const response = await api.post('/invitations/join', { invite_code: inviteCode });
    return response.data.data.cooperative;
  }
};
