import { API_BASES } from './config';
import { authAxios } from './httpClient';

export const newsApi = {
    getGlobalNews: (limit = 20) => authAxios.get(`${API_BASES.news}/global`, { params: { limit } }),
    getPortfolioNews: (email, limit) =>
        authAxios.get(`${API_BASES.news}/portfolio`, { params: { email, limit } }),
    getLatestNews: (limit = 40) => authAxios.get(`${API_BASES.news}/latest`, { params: { limit } })
};
