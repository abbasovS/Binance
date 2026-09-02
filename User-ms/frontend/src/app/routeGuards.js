import { jwtDecode } from 'jwt-decode';
import { getAccessToken } from '../api/httpClient';

export const isAdminUser = () => {
    const token = getAccessToken();

    if (!token) return false;

    try {
        const decoded = jwtDecode(token);
        return decoded?.role === 'ROLE_ADMIN';
    } catch {
        return false;
    }
};

export const hasAccessToken = () => {
    return !!getAccessToken();
};