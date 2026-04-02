import { API_BASES } from './config';
import { authAxios } from './httpClient';

export const adminApi = {
    getDashboard: () => authAxios.get(`${API_BASES.admin}/dashboard`),
    getUsers: () => authAxios.get(`${API_BASES.admin}/users`),
    toggleStatus: (userId) => authAxios.put(`${API_BASES.admin}/users/${userId}/status`, {}),
    changeRole: (userId, role) => authAxios.put(`${API_BASES.admin}/users/${userId}/role`, { role }),
    togglePremium: (userId) => authAxios.put(`${API_BASES.admin}/users/${userId}/premium`, {}),
    toggleTournament: (userId) => authAxios.put(`${API_BASES.admin}/users/${userId}/tournament`, {}),
    controlTournament: (action) => authAxios.post(`${API_BASES.admin}/tournament/control`, {}, { params: { action } }),
    broadcast: (text) => authAxios.post(`${API_BASES.admin}/broadcast`, text, {
        headers: { 'Content-Type': 'text/plain' }
    })
};
