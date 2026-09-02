import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasAccessToken, isAdminUser } from './routeGuards';
import { useAuthReady } from './AuthReadyContext';

const AdminRoute = ({ children }) => {
    const location = useLocation();
    const authReady = useAuthReady();

    if (!authReady) {
        return null;
    }

    if (!hasAccessToken()) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    if (!isAdminUser()) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;