import { API_BASES } from './config';
import { apiAxios, authAxios } from './httpClient';

export const authApi = {
    disconnectTelegram: () => authAxios.post(`${API_BASES.user}/telegram/disconnect`),

    // system-info auth olmadan da çağırıla bilməlidir
    getSystemInfo: () => apiAxios.get(`${API_BASES.user}/system-info`),

    signup: (formData) => apiAxios.post(`${API_BASES.user}/signup`, formData),
    login: (email, password) => apiAxios.post(`${API_BASES.user}/login`, { email, password }),
    verify: (email, code) => apiAxios.post(`${API_BASES.user}/verify`, { email, code }),

    getTelegramStatus: () => authAxios.get(`${API_BASES.user}/telegram/me`),
    initTelegramConnection: () => authAxios.post(`${API_BASES.user}/telegram/connect/init`),
    confirmTelegramConnection: () => authAxios.post(`${API_BASES.user}/telegram/connect/confirm`),

    // backend-də həm credential, həm idToken support var, amma biz prod üçün credential göndərək
    googleLogin: (credential) => apiAxios.post(`${API_BASES.user}/google`, { credential }),

    refreshToken: (refreshToken) => apiAxios.post(`${API_BASES.user}/refresh`, { refreshToken }),
    logout: () => authAxios.post(`${API_BASES.user}/logout`)
};