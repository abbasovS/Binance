import axios from 'axios';
import { APP_CONFIG } from './config';

let accessTokenMemory = null;

export const getAccessToken = () => accessTokenMemory;

export const setAccessToken = (token) => {
    accessTokenMemory = token || null;
    window.dispatchEvent(new Event('auth-state-changed'));
};

export const clearAccessToken = () => {
    accessTokenMemory = null;
    window.dispatchEvent(new Event('auth-state-changed'));
};

export const clearAuthStorage = () => {
    accessTokenMemory = null;
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    window.dispatchEvent(new Event('auth-state-changed'));
};

export const apiAxios = axios.create({
    baseURL: APP_CONFIG.gatewayUrl,
    withCredentials: true,
});

apiAxios.interceptors.request.use(
    (config) => {
        const token = getAccessToken();

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = token.startsWith('Bearer ')
                ? token
                : `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;

        if (status === 401) {
            clearAuthStorage();
            window.dispatchEvent(new Event('auth-error'));
        } else if (status === 403) {
            window.dispatchEvent(new Event('auth-forbidden'));
        }

        return Promise.reject(error);
    }
);

export const authAxios = apiAxios;

export default apiAxios;