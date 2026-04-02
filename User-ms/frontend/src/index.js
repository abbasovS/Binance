import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 1. GOOGLE LOGIN IMPORTU ƏLAVƏ EDİLDİ
import { GoogleOAuthProvider } from '@react-oauth/google';

import './index.css';

import UserPage from './features/user/pages/UserPage';
import TradeMsPage from './features/trade/pages/TradeMsPage';
import TradeTerminalPage from './features/trade/pages/TradeTerminalPage';
import AdminPage from './features/user/admin/AdminPage';
import PrivacyPolicy from './features/user/components/PrivacyPolicy';

import reportWebVitals from './reportWebVitals';

const queryClient = new QueryClient();

if (process.env.NODE_ENV === 'development') {
    window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK_OKAY_OH_M_G__ = {
        handleRuntimeError: () => {},
        handleUnhandledRejection: () => {}
    };

    const originalError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
        if (message === 'Script error.' || (source && source.includes('tradingview'))) {
            return true;
        }
        return originalError ? originalError.apply(this, arguments) : false;
    };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        {/* 2. BÜTÜN APP GOOGLE PROVIDER İÇİNƏ SALINIR */}
        <GoogleOAuthProvider clientId="SƏNİN_BAYAQLA_KOPYALADIĞIN_CLIENT_ID_BURAYA_YAZ">

            <QueryClientProvider client={queryClient}>
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        style: {
                            background: '#161a1e',
                            color: '#fff',
                            border: '1px solid #2b3139',
                            borderRadius: '12px',
                            padding: '16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        },
                        success: {
                            iconTheme: { primary: '#00ffa3', secondary: '#000' }
                        },
                        error: {
                            iconTheme: { primary: '#f84960', secondary: '#fff' },
                            duration: 4000
                        }
                    }}
                />

                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<UserPage />} />
                        <Route path="/trade-ms" element={<TradeMsPage />} />
                        <Route path="/terminal" element={<TradeTerminalPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    </Routes>
                </BrowserRouter>
            </QueryClientProvider>

        </GoogleOAuthProvider>
    </React.StrictMode>
);

reportWebVitals();