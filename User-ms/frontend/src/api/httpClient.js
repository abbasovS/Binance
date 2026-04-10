import axios from 'axios';
import { GATEWAY_URL } from './config';

const BASE_URL = GATEWAY_URL || '';

const commonConfig = {
    baseURL: BASE_URL,
    timeout: 60000
};

export const apiAxios = axios.create(commonConfig);
export const authAxios = axios.create(commonConfig);

authAxios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');

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

authAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;

        if (status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userEmail');
            window.dispatchEvent(new Event('auth-error'));
        }

        if (status === 403) {
            window.dispatchEvent(new Event('auth-forbidden'));
        }

        return Promise.reject(error);
    }
);