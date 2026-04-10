import React from 'react';
import { Routes, Route } from 'react-router-dom';

import UserPage from '../features/user/pages/UserPage';
import TradeMsPage from '../features/trade/pages/TradeMsPage';
import TradeTerminalPage from '../features/trade/pages/TradeTerminalPage';
import AdminPage from '../features/user/admin/AdminPage';
import PrivacyPolicy from '../features/user/components/PrivacyPolicy';

import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<UserPage />} />

            <Route
                path="/trade-ms"
                element={
                    <ProtectedRoute>
                        <TradeMsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/terminal"
                element={
                    <ProtectedRoute>
                        <TradeTerminalPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <AdminPage />
                    </AdminRoute>
                }
            />

            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
    );
}

export default AppRoutes;