import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthReadyContext } from './AuthReadyContext';
import { authApi } from '../api/authApi';
import { clearAuthStorage, getAccessToken, setAccessToken } from '../api/httpClient';

const AuthBootstrap = ({ children }) => {
    const [authReady, setAuthReady] = useState(!!getAccessToken());

    useEffect(() => {
        let active = true;

        const bootstrap = async () => {
            if (getAccessToken()) {
                if (active) setAuthReady(true);
                return;
            }

            try {
                const res = await authApi.refresh();
                const newAccessToken = res?.data?.accessToken;

                if (!newAccessToken) {
                    throw new Error('Access token not returned');
                }

                setAccessToken(newAccessToken);

                try {
                    const decoded = jwtDecode(newAccessToken);
                    const restoredEmail = decoded?.sub || decoded?.email || '';
                    if (restoredEmail) {
                        localStorage.setItem('userEmail', restoredEmail);
                    }
                } catch (e) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Failed to decode restored token', e);
                    }
                }

                if (!active) return;
                setAuthReady(true);
            } catch (err) {
                if (!active) return;
                clearAuthStorage();
                setAuthReady(true);
            }
        };

        bootstrap();

        return () => {
            active = false;
        };
    }, []);

    return (
        <AuthReadyContext.Provider value={authReady}>
            {children}
        </AuthReadyContext.Provider>
    );
};

export default AuthBootstrap;