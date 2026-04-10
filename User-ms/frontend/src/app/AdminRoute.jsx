import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasToken, isAdminUser } from './routeGuards';

const AdminRoute = ({ children }) => {
    const location = useLocation();

    if (!hasToken()) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    if (!isAdminUser()) {
        return <Navigate to="/" replace state={{ forbiddenFrom: location.pathname }} />;
    }

    return children;
};

export default AdminRoute;