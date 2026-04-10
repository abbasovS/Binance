import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';

import './index.css';
import AppRoutes from './app/AppRoutes';
import { APP_CONFIG } from './api/config';
import reportWebVitals from './reportWebVitals';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false
        }
    }
});

if (process.env.NODE_ENV === 'development') {
    window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK_OKAY_OH_M_G__ = {
        handleRuntimeError: () => {},
        handleUnhandledRejection: () => {}
    };

    const originalError = window.onerror;
    window.onerror = function (message, source) {
        if (message === 'Script error.' || (source && source.includes('tradingview'))) {
            return true;
        }
        return originalError ? originalError.apply(this, arguments) : false;
    };
}

const AppProviders = ({ children }) => {
    const content = (
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
            <BrowserRouter>{children}</BrowserRouter>
        </QueryClientProvider>
    );

    if (APP_CONFIG.googleClientId) {
        return (
            <GoogleOAuthProvider clientId={APP_CONFIG.googleClientId}>
                {content}
            </GoogleOAuthProvider>
        );
    }

    return content;
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <AppProviders>
            <AppRoutes />
        </AppProviders>
    </React.StrictMode>
);

reportWebVitals();