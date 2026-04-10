import { API_BASES } from './config';
import { authAxios } from './httpClient';

export const notificationApi = {
    getMyNotifications: ({ page = 0, size = 10 } = {}) =>
        authAxios.get(`${API_BASES.user}/notifications`, {
            params: { page, size }
        }),

    getUnreadCount: () =>
        authAxios.get(`${API_BASES.user}/notifications/unread-count`),

    markAsRead: (notificationId) =>
        authAxios.patch(`${API_BASES.user}/notifications/${notificationId}/read`),

    markAllAsRead: () =>
        authAxios.patch(`${API_BASES.user}/notifications/read-all`)
};