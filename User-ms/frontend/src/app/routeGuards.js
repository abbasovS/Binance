export const getStoredUser = () => {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const hasToken = () => {
    return Boolean(localStorage.getItem('token'));
};

export const isAdminUser = () => {
    const user = getStoredUser();
    return user?.role === 'ROLE_ADMIN';
};