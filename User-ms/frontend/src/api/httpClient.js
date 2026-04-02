import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

export const apiAxios = axios.create({
    baseURL: BASE_URL,
    timeout: 60000
});

export const authAxios = axios.create({
    baseURL: BASE_URL,
    timeout: 60000
});

authAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers = config.headers || {};

        const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        config.headers.Authorization = tokenValue;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

authAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.dispatchEvent(new Event('auth-error'));
        }
        return Promise.reject(error);
    }
);