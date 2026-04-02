import { API_BASES } from './config';
import { authAxios } from './httpClient';

export const cryptoApi = {
    getWatchlist: () => authAxios.get(`${API_BASES.crypto}/watchlist`),
    addToWatchlist: (symbol) => authAxios.post(`${API_BASES.crypto}/add/${symbol}`),
    removeFromWatchlist: (symbol) => authAxios.delete(`${API_BASES.crypto}/remove/${symbol}`),
    generateAnalysis: (symbol) => authAxios.post(`${API_BASES.analysis}/generate?symbol=${symbol}`),
    getAlerts: () => authAxios.get(`${API_BASES.crypto}/alert/all`),
    addAlert: (data) => authAxios.post(`${API_BASES.crypto}/alert/add`, data),
    deleteAlert: (id) => authAxios.delete(`${API_BASES.crypto}/alert/delete/${id}`),
    searchPrice: (symbol) => authAxios.get(`${API_BASES.crypto}/price/${symbol}`),
    getBatchPrices: (symbols) =>
        authAxios.get(`${API_BASES.crypto}/prices`, {
            params: { symbols: symbols.join(',') }
        })
};