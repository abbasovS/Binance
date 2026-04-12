import axios from 'axios';
import { GATEWAY_URL } from './config';

const BASE_URL = GATEWAY_URL || '';

const commonConfig = {
    baseURL: BASE_URL,
    timeout: 60000
};

export const apiAxios = axios.create(commonConfig);
export const authAxios = axios.create(commonConfig);

let isRefreshing = false;
let pendingRequests = [];
let authErrorDispatchedAt = 0;
let authForbiddenDispatchedAt = 0;

const AUTH_EVENT_COOLDOWN_MS = 2000;

const dispatchWindowEventWithCooldown = (eventName) => {
    const now = Date.now();

    if (eventName === 'auth-error') {
        if (now - authErrorDispatchedAt < AUTH_EVENT_COOLDOWN_MS) return;
        authErrorDispatchedAt = now;
    }

    if (eventName === 'auth-forbidden') {
        if (now - authForbiddenDispatchedAt < AUTH_EVENT_COOLDOWN_MS) return;
        authForbiddenDispatchedAt = now;
    }

    window.dispatchEvent(new Event(eventName));
};

const clearAuthStorage = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
};

const resolvePendingRequests = (newAccessToken) => {
    pendingRequests.forEach((callback) => callback(newAccessToken));
    pendingRequests = [];
};

const rejectPendingRequests = () => {
    pendingRequests.forEach((callback) => callback(null));
    pendingRequests = [];
};

authAxios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');

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
    async (error) => {
        const originalRequest = error.config;
        const status = error?.response?.status;
        const url = originalRequest?.url || '';

        if (status === 403) {
            dispatchWindowEventWithCooldown('auth-forbidden');
            return Promise.reject(error);
        }

        const isRefreshRequest = url.includes('/api/user/refresh');
        const isLoginRequest = url.includes('/api/user/login');
        const isSignupRequest = url.includes('/api/user/signup');
        const isVerifyRequest = url.includes('/api/user/verify');
        const isGoogleRequest = url.includes('/api/user/google');

        if (
            status !== 401 ||
            originalRequest?._retry ||
            isRefreshRequest ||
            isLoginRequest ||
            isSignupRequest ||
            isVerifyRequest ||
            isGoogleRequest
        ) {
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            clearAuthStorage();
            dispatchWindowEventWithCooldown('auth-error');
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingRequests.push((newAccessToken) => {
                    if (!newAccessToken) {
                        reject(error);
                        return;
                    }

                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = newAccessToken.startsWith('Bearer ')
                        ? newAccessToken
                        : `Bearer ${newAccessToken}`;

                    resolve(authAxios(originalRequest));
                });
            });
        }

        isRefreshing = true;

        try {
            const refreshResponse = await apiAxios.post('/api/user/refresh', { refreshToken });
            const newAccessToken = refreshResponse?.data?.accessToken;
            const newRefreshToken = refreshResponse?.data?.refreshToken;

            if (!newAccessToken || !newRefreshToken) {
                throw new Error('Token refresh response invalid');
            }

            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            resolvePendingRequests(newAccessToken);

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = newAccessToken.startsWith('Bearer ')
                ? newAccessToken
                : `Bearer ${newAccessToken}`;

            return authAxios(originalRequest);
        } catch (refreshError) {
            clearAuthStorage();
            rejectPendingRequests();
            dispatchWindowEventWithCooldown('auth-error');
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);