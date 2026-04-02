    import { API_BASES } from './config';
    import { apiAxios, authAxios } from './httpClient';

    export const authApi = {
        disconnectTelegram: () => authAxios.post(`${API_BASES.user}/telegram/disconnect`),
        getSystemInfo: () => authAxios.get(`${API_BASES.user}/system-info`),

        signup: (formData) => apiAxios.post(`${API_BASES.user}/signup`, formData),
        login: (email, password) => apiAxios.post(`${API_BASES.user}/login`, { email, password }),
        verify: (email, code) => apiAxios.post(`${API_BASES.user}/verify`, { email, code }),

        connectTelegram: (chatId) => authAxios.put(`${API_BASES.user}/telegram/connect`, { chatId }),
        getTelegramStatus: () => authAxios.get(`${API_BASES.user}/telegram/me`),
        initTelegramConnection: () => authAxios.post(`${API_BASES.user}/telegram/connect/init`),
        confirmTelegramConnection: () => authAxios.post(`${API_BASES.user}/telegram/connect/confirm`),
        googleLogin: (idToken) => apiAxios.post(`${API_BASES.user}/google`, { idToken }),
    };
