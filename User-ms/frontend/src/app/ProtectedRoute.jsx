import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasToken } from './routeGuards';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();

    if (!hasToken()) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    return children;
};

export default ProtectedRoute;