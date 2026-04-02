import { API_BASES } from './config';
import { apiAxios, authAxios } from './httpClient';

export const tradeApi = {
    getLeaderboard: () => apiAxios.get(`${API_BASES.users}/leaderboard`),
    getContestStatus: () => apiAxios.get(`${API_BASES.users}/contest/status`),


    createUser: (payload) => authAxios.post(`${API_BASES.users}/create`, payload),

    getCurrentUser: () => authAxios.get(`${API_BASES.users}/me`),

    getActiveTrades: () => authAxios.get(`${API_BASES.trades}/active`),
    getPendingTrades: () => authAxios.get(`${API_BASES.trades}/pending`),
    openTrade: (payload) => authAxios.post(`${API_BASES.trades}/open`, payload),
    closeTrade: (tradeId) => authAxios.delete(`${API_BASES.trades}/close/${tradeId}`),
    cancelTrade: (tradeId) => authAxios.delete(`${API_BASES.trades}/cancel/${tradeId}`),
    updateTpSl: (tradeId, payload) => authAxios.put(`${API_BASES.trades}/update-tpsl/${tradeId}`, payload),

    getWithdrawBalance: () => authAxios.get(`${API_BASES.withdraw}/balance`),
    requestWithdraw: (payload) => authAxios.post(`${API_BASES.withdraw}/request`, payload),

    getTradeHistory: () => authAxios.get(`${API_BASES.trades}/history`),
    getPublicTradeHistory: (userId) => authAxios.get(`${API_BASES.trades}/history/${userId}`)
};