import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import '../../../shared/styles/App.css';
import '../../../shared/styles/Auth.css';
import '../../../shared/styles/Trade.css';

import AuthForm from '../components/AuthForm';
import DashboardShell from '../components/dashboard/DashboardShell';
import { authApi, cryptoApi, notificationApi, tradeApi } from '../../../api';

function User() {
    const navigate = useNavigate();

    // UI states
    const [view, setView] = useState(() =>
        localStorage.getItem('accessToken') ? 'dashboard' : 'login'
    );
    const [isLiquidityOpen, setIsLiquidityOpen] = useState(false);
    const [isTestWarningOpen, setIsTestWarningOpen] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isWhaleRadarOpen, setIsWhaleRadarOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
    const [isSentimentOpen, setIsSentimentOpen] = useState(false);

    // ADMIN
    const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const [notificationLoading, setNotificationLoading] = useState(false);

    // Data states
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [expandedCoin, setExpandedCoin] = useState(null);
    const [chartBase64, setChartBase64] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [portfolioInput, setPortfolioInput] = useState('');
    const [alertInput, setAlertInput] = useState({ symbol: '', targetPrice: '' });
    const [systemMessage, setSystemMessage] = useState('');
    const [telegramStatus, setTelegramStatus] = useState({ connected: false, chatId: '' });
    const [prices, setPrices] = useState({});

    // Auth states
    const [message, setMessage] = useState({ text: '', type: '' });
    const [authLoading, setAuthLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        phoneNumber: '',
        verificationCode: '',
    });

    const [authState, setAuthState] = useState(() => ({
        token: localStorage.getItem('accessToken') || '',
        userEmail: localStorage.getItem('userEmail') || '',
    }));

    const token = authState.token;
    const userEmail = authState.userEmail;

    useEffect(() => {
        const syncAuthState = () => {
            setAuthState({
                token: localStorage.getItem('accessToken') || '',
                userEmail: localStorage.getItem('userEmail') || '',
            });
        };

        window.addEventListener('storage', syncAuthState);
        window.addEventListener('auth-error', syncAuthState);

        return () => {
            window.removeEventListener('storage', syncAuthState);
            window.removeEventListener('auth-error', syncAuthState);
        };
    }, []);

    const {
        data: watchlist = [],
        refetch: refetchWatchlist,
    } = useQuery({
        queryKey: ['watchlist'],
        queryFn: () => cryptoApi.getWatchlist().then((res) => res.data),
        enabled: !!token && view === 'dashboard',
    });

    const {
        data: alerts = [],
        refetch: refetchAlerts,
    } = useQuery({
        queryKey: ['alerts'],
        queryFn: () => cryptoApi.getAlerts().then((res) => res.data),
        enabled: !!token && view === 'dashboard',
    });

    const { data: openPositions = [] } = useQuery({
        queryKey: ['openPositions'],
        queryFn: () => tradeApi.getActiveTrades().then((res) => res.data),
        enabled: !!token && view === 'dashboard',
    });

    useQuery({
        queryKey: ['systemInfo', userEmail || 'guest'],
        queryFn: () => authApi.getSystemInfo().then((res) => res.data),
        refetchInterval: 10000,
        onSuccess: (data) => {
            const msg = data?.globalMessage;
            const storageKey = userEmail
                ? `lastSeenMessage_${userEmail}`
                : 'lastSeenMessage_guest';

            if (msg && localStorage.getItem(storageKey) !== msg) {
                setSystemMessage(msg);
            }
        },
    });

    const closeSystemMessage = () => {
        if (!userEmail || !systemMessage) {
            setSystemMessage('');
            return;
        }

        const storageKey = `lastSeenMessage_${userEmail}`;
        localStorage.setItem(storageKey, systemMessage);
        setSystemMessage('');
    };




    const handleTickerCoinClick = (coinSymbol) => {
        if (!coinSymbol) return;
        handleProAnalysis(coinSymbol);
    };



    const fetchNotifications = useCallback(async () => {
        if (!token) return;

        try {
            setNotificationLoading(true);

            const [listRes, countRes] = await Promise.all([
                notificationApi.getMyNotifications({ page: 0, size: 20 }),
                notificationApi.getUnreadCount(),
            ]);

            setNotifications(listRes?.data?.content || []);
            setNotificationUnreadCount(countRes?.data?.unreadCount || 0);
        } catch (err) {
            if (err?.response?.status === 401) {
                return;
            }

            console.error('Notification fetch error:', err);
        } finally {
            setNotificationLoading(false);
        }
    }, [token]);

    const handleMarkNotificationRead = async (notificationId) => {
        try {
            await notificationApi.markAsRead(notificationId);
            await fetchNotifications();
        } catch (err) {
            toast.error('Notification read update failed');
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            await fetchNotifications();
            toast.success('All notifications marked as read');
        } catch (err) {
            toast.error('Could not mark all notifications as read');
        }
    };

    useEffect(() => {
        const handleAuthError = () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('userEmail');

            setAuthState({
                token: '',
                userEmail: '',
            });

            setView('login');
            navigate('/');
            toast.error('Your session expired. Please log in again.');
        };

        const handleAuthForbidden = () => {
            toast.error('You do not have permission to access this resource.');
        };

        window.addEventListener('auth-error', handleAuthError);
        window.addEventListener('auth-forbidden', handleAuthForbidden);

        return () => {
            window.removeEventListener('auth-error', handleAuthError);
            window.removeEventListener('auth-forbidden', handleAuthForbidden);
        };
    }, [navigate]);

    const getTournamentWarningKey = () => {
        return userEmail
            ? `tournament_warning_seen_${userEmail}`
            : 'tournament_warning_seen_guest';
    };

    const handleTournamentAccess = () => {
        const warningSeen = localStorage.getItem(getTournamentWarningKey()) === 'true';

        if (warningSeen) {
            navigate('/trade-ms');
            return;
        }

        setIsChecked(false);
        setIsTestWarningOpen(true);
    };

    const closeTournamentWarning = () => {
        setIsChecked(false);
        setIsTestWarningOpen(false);
    };

    useEffect(() => {
        if (token && (view === 'login' || view === 'signup' || view === 'otp')) {
            setView('dashboard');
        } else if (!token && view === 'dashboard') {
            setView('login');
        }
    }, [token, view]);

    const dashboardSymbols = useMemo(() => {
        return [
            ...new Set([
                ...(watchlist || []).map((w) => w?.symbol),
                ...(alerts || []).map((a) => a?.symbol),
                ...(openPositions || []).map((p) => p?.symbol),
            ]),
        ].filter(Boolean);
    }, [watchlist, alerts, openPositions]);

    useEffect(() => {
        if (view !== 'dashboard' || !token) return;
        if (dashboardSymbols.length === 0) return;

        let isMounted = true;

        const fetchBatchPrices = async () => {
            try {
                const res = await cryptoApi.getBatchPrices(dashboardSymbols);
                const newPrices = {};

                (res.data || []).forEach((item) => {
                    const coinData = {
                        symbol: item.symbol,
                        price: item.price,
                        change: item.change,
                        high: item.high,
                        low: item.low,
                        volume: item.volume,
                        baseVolume: item.baseVolume,
                        vwap: item.vwap,
                        priceChangeAmt: item.priceChangeAmt,
                    };

                    if (item.symbol) {
                        newPrices[item.symbol] = coinData;
                        newPrices[item.symbol.replace('USDT', '')] = coinData;
                    }
                });

                if (isMounted) {
                    setPrices((prev) => ({ ...prev, ...newPrices }));
                }
            } catch (err) {
                if (err?.response?.status === 401) return;
                console.error('Batch price fetch error:', err);
            }
        };

        fetchBatchPrices();
        const interval = setInterval(fetchBatchPrices, 8000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [view, token, dashboardSymbols]);

    useEffect(() => {
        if (!token || view !== 'dashboard') return;

        fetchNotifications();

        const interval = setInterval(() => {
            fetchNotifications();
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchNotifications, token, view]);

    const fetchTelegramStatus = useCallback(async () => {
        try {
            const res = await authApi.getTelegramStatus();
            setTelegramStatus(res?.data || { connected: false, chatId: '' });
        } catch (err) {
            if (err?.response?.status === 401) {
                return;
            }

            console.error('Telegram status fetch error', err);
        }
    }, []);

    useEffect(() => {
        if (!token || view !== 'dashboard') return;
        fetchTelegramStatus();
    }, [token, view, fetchTelegramStatus]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (message.text) setMessage({ text: '', type: '' });
    };

    const handleProAnalysis = async (directSymbol = null) => {
        let currentSymbol = (
            typeof directSymbol === 'string' ? directSymbol : searchTerm
        )
            .trim()
            .toUpperCase();

        if (!currentSymbol) {
            toast('Please enter a coin name!', { icon: '⚠️' });
            return;
        }

        if (!currentSymbol.endsWith('USDT')) currentSymbol += 'USDT';

        setIsSearchOpen(false);
        setSymbol(currentSymbol);
        setIsModalOpen(true);
        setChartBase64(null);

        try {
            const response = await cryptoApi.generateAnalysis(currentSymbol);
            if (response.data?.chart) setChartBase64(response.data.chart);
        } catch (error) {
            setIsModalOpen(false);
            toast.error('Analysis not found for this coin.');
        }
    };

    const handleTelegramDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect Telegram?')) return;

        try {
            await authApi.disconnectTelegram();
            await fetchTelegramStatus();
            toast.success('Disconnected successfully.');
        } catch (err) {
            toast.error('An error occurred while disconnecting.');
        }
    };

    const addToWatchlist = async () => {
        if (!portfolioInput || portfolioInput.trim() === '') {
            toast('Please enter a coin name', { icon: '⚠️' });
            return;
        }

        try {
            const rawSymbol = portfolioInput.trim().toUpperCase();
            const formattedSymbol = rawSymbol.endsWith('USDT')
                ? rawSymbol
                : `${rawSymbol}USDT`;

            if (watchlist.some((item) => item.symbol === formattedSymbol)) {
                setPortfolioInput('');
                return;
            }

            const response = await cryptoApi.addToWatchlist(formattedSymbol);

            if (response.status === 200 || response.status === 201) {
                toast.success('Coin added to portfolio!');
                await refetchWatchlist();
                setPortfolioInput('');
            }
        } catch (err) {
            toast.error('An error occurred while adding to watchlist.');
        }
    };

    const removeFromWatchlist = async (watchlistItem) => {
        if (!watchlistItem) return;

        const symbolToRemove =
            typeof watchlistItem === 'string'
                ? watchlistItem
                : watchlistItem.symbol || watchlistItem.id;

        if (!symbolToRemove) return;

        try {
            await cryptoApi.removeFromWatchlist(symbolToRemove);
            toast.success(`${symbolToRemove} removed from portfolio.`);
            await refetchWatchlist();
        } catch (err) {
            console.error('removeFromWatchlist error:', err);
            toast.error('An error occurred while removing the coin.');
        }
    };

    const handleGoogleLogin = async (googleResponse) => {
        if (authLoading) return;

        const credential = googleResponse?.credential;

        if (!credential) {
            toast.error('Google credential was not received.');
            return;
        }

        try {
            setAuthLoading(true);

            const response = await authApi.googleLogin(credential);

            if (response.status === 200) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                const data = response.data;
                const accessToken = data?.accessToken;
                const refreshToken = data?.refreshToken;

                if (!accessToken || !refreshToken) {
                    throw new Error('Tokens not received');
                }

                let userEmailFromToken = '';
                let userRole = 'ROLE_USER';

                try {
                    const base64Url = accessToken.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(decodeURIComponent(window.atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join('')));
                    userEmailFromToken = payload?.sub || payload?.email || '';
                    userRole = payload?.role || 'ROLE_USER';
                } catch (decodeError) {
                    console.error('Google token decode error:', decodeError);
                }

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);

                if (userEmailFromToken) {
                    localStorage.setItem('userEmail', userEmailFromToken);
                }

                localStorage.setItem('user', JSON.stringify({
                    id: data?.id || null,
                    email: userEmailFromToken || formData.email || '',
                    premium: Boolean(data?.premium),
                    role: userRole,
                }));

                setAuthState({
                    token: accessToken,
                    userEmail: userEmailFromToken || '',
                });

                setFormData({
                    email: '',
                    password: '',
                    phoneNumber: '',
                    verificationCode: '',
                });

                toast.success('Google login successful!');
                setView('dashboard');
            }
        } catch (error) {
            if (!error.response) {
                toast.error('System is currently unreachable (Network Error). Please try again later.');
                return;
            }

            const errorData = error.response.data;
            const errorMsg =
                errorData?.message ||
                (typeof errorData === 'string' ? errorData : '') ||
                'Google Login failed!';

            toast.error(errorMsg);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSignup = async (e, fullPhoneNumber) => {
        e.preventDefault();
        if (authLoading) return;

        const email = formData.email?.trim().toLowerCase();
        const password = formData.password;
        const rawPhone = (fullPhoneNumber || formData.phoneNumber || '').replace(/\s/g, '');

        if (!email || email.length < 2 || email.length > 100) {
            return toast.error('Email is invalid.');
        }

        const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$/;
        if (!password || password.length < 8 || !passwordRegex.test(password)) {
            return toast.error(
                'Password must be at least 8 characters, including uppercase, lowercase, and numbers.'
            );
        }

        const phoneRegex = /^\+[1-9]\d{6,14}$/;
        if (!phoneRegex.test(rawPhone)) {
            return toast.error('Enter a valid phone number (e.g., +994501234567)');
        }

        try {
            setAuthLoading(true);

            const response = await authApi.signup({
                email,
                password,
                phoneNumber: rawPhone,
            });

            if (response.status === 200 || response.status === 201) {
                localStorage.setItem('userEmail', email);

                setAuthState((prev) => ({
                    ...prev,
                    userEmail: email,
                }));

                setFormData((prev) => ({
                    ...prev,
                    email,
                    phoneNumber: rawPhone,
                    verificationCode: '',
                }));

                toast.success('Registration successful! Code sent to your email.');
                setView('otp');
            }
        } catch (error) {
            if (!error.response) {
                toast.error('System is currently unreachable (Network Error). Please try again later.');
                return;
            }

            const errorData = error.response.data;
            let finalMessage = 'An error occurred during registration!';

            if (typeof errorData === 'string') {
                finalMessage = errorData;
            } else if (errorData?.message) {
                finalMessage = errorData.message;
            } else if (errorData?.errors) {
                finalMessage = Object.values(errorData.errors)[0];
            }

            const lowerMessage = String(finalMessage).toLowerCase();

            if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
                finalMessage = lowerMessage.includes('email')
                    ? 'Email already exists.'
                    : lowerMessage.includes('phone')
                        ? 'Phone Number already exists.'
                        : 'This data already exists.';
            }

            toast.error(finalMessage);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (authLoading) return;

        const verificationEmail =
            formData.email?.trim().toLowerCase() || localStorage.getItem('userEmail');
        const normalizedOtp = (formData.verificationCode || '').trim();

        if (!verificationEmail) {
            setView('signup');
            return toast.error('Email not found. Please register again.');
        }

        if (!/^\d{6}$/.test(normalizedOtp)) {
            return toast('OTP code must be 6 digits.', { icon: '⚠️' });
        }

        try {
            setAuthLoading(true);

            const response = await authApi.verify(verificationEmail, normalizedOtp);

            if (response.status === 200) {
                toast.success('Account verified! You can now log in.');
                setFormData((prev) => ({
                    ...prev,
                    verificationCode: '',
                    password: '',
                }));
                setView('login');
            }
        } catch (error) {
            const errorData = error?.response?.data;
            const errorMsg =
                errorData?.message ||
                (typeof errorData === 'string' ? errorData : '') ||
                'Code is incorrect or expired!';

            toast.error(errorMsg);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (authLoading) return;

        const normalizedEmail = formData.email?.trim().toLowerCase();

        if (!normalizedEmail || !formData.password) {
            return toast('Please enter email and password.', { icon: '⚠️' });
        }

        try {
            setAuthLoading(true);

            const response = await authApi.login(normalizedEmail, formData.password);

            if (response.status === 200) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                const data = response.data;
                const accessToken = data?.accessToken;
                const refreshToken = data?.refreshToken;

                if (!accessToken || !refreshToken) {
                    throw new Error('Tokens not received');
                }

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('userEmail', normalizedEmail);

                let userRole = 'ROLE_USER';
                try {
                    const base64Url = accessToken.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(decodeURIComponent(window.atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join('')));
                    userRole = payload?.role || 'ROLE_USER';
                } catch (decodeError) {
                    console.error('Token decode error:', decodeError);
                }

                localStorage.setItem(
                    'user',
                    JSON.stringify({
                        id: data?.id || null,
                        email: normalizedEmail,
                        premium: Boolean(data?.premium),
                        role: userRole,
                    })
                );
                setAuthState({
                    token: accessToken,
                    userEmail: normalizedEmail,
                });

                setFormData({
                    email: '',
                    password: '',
                    phoneNumber: '',
                    verificationCode: '',
                });

                toast.success('Login successful!');
                setView('dashboard');
            }
        } catch (error) {
            if (!error.response) {
                toast.error('System is currently unreachable (Network Error). Please try again later.');
                return;
            }

            const errorData = error.response.data;
            let errorText = 'Incorrect email or password!';

            const backendMessage =
                errorData?.message || (typeof errorData === 'string' ? errorData : '');

            if (backendMessage) {
                const lowerMessage = backendMessage.toLowerCase();

                if (lowerMessage.includes('blocked') || lowerMessage.includes('bloklanıb')) {
                    errorText = 'Your account has been blocked by the admin!';
                } else if (
                    lowerMessage.includes('verify') ||
                    lowerMessage.includes('təsdiq') ||
                    lowerMessage.includes('email təsdiqlənməyib')
                ) {
                    errorText = 'Please verify your email first!';
                } else {
                    errorText = backendMessage;
                }
            }

            toast.error(errorText);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleDeleteClick = (item) => {
        setDeleteTarget(item);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        const id = deleteTarget.id || deleteTarget.alertId || deleteTarget._id;

        try {
            await cryptoApi.deleteAlert(id);
            setDeleteTarget(null);
            toast.success('Alert deleted successfully.');
            await refetchAlerts();
        } catch (err) {
            toast.error('Server could not delete this ID.');
        }
    };

    const addAlert = async () => {
        const rawSymbol = (alertInput.symbol || '').trim().toUpperCase();
        const rawTarget = String(alertInput.targetPrice || '').trim();

        if (!rawSymbol || !rawTarget) {
            toast('Please fill in all fields!', { icon: '⚠️' });
            return;
        }

        if (!telegramStatus?.connected || !telegramStatus?.chatId) {
            toast.error('Please connect Telegram before creating an alert.');
            return;
        }

        const targetPrice = Number(rawTarget);
        if (Number.isNaN(targetPrice) || targetPrice <= 0) {
            toast.error('Target price must be a valid positive number.');
            return;
        }

        try {
            const formattedSymbol = rawSymbol.endsWith('USDT')
                ? rawSymbol
                : `${rawSymbol}USDT`;

            await cryptoApi.addAlert({
                symbol: formattedSymbol,
                targetPrice,
                chatId: String(telegramStatus.chatId),
            });

            setAlertInput({ symbol: '', targetPrice: '' });
            toast.success('Price alert added successfully!');
            await refetchAlerts();
        } catch (err) {
            console.error('addAlert error:', err);

            const serverMessage =
                err?.response?.data?.message ||
                err?.response?.data ||
                'An error occurred while adding the alert!';

            toast.error(
                typeof serverMessage === 'string'
                    ? serverMessage
                    : 'An error occurred while adding the alert!'
            );
        }
    };

    const initTelegramConnection = async () => {
        try {
            const res = await authApi.initTelegramConnection();
            const connectUrl = res.data?.connectUrl;

            if (!connectUrl) {
                return toast.error('Telegram connection could not be created');
            }

            const telegramWindow = window.open(connectUrl, '_blank', 'noopener,noreferrer');

            if (
                !telegramWindow ||
                telegramWindow.closed ||
                typeof telegramWindow.closed === 'undefined'
            ) {
                toast.success('Redirecting...', { icon: '🔄' });
                setTimeout(() => {
                    window.location.href = connectUrl;
                }, 1000);
            }
        } catch (err) {
            toast.error('An error occurred while fetching the Telegram link');
        }
    };

    const confirmTelegramConnection = async () => {
        try {
            const res = await authApi.confirmTelegramConnection();
            setTelegramStatus(res.data || { connected: false, chatId: '' });

            if (res.data?.connected) {
                toast.success('Telegram connected successfully');
                setIsTelegramModalOpen(false);
            } else {
                toast('Connection not found yet. Please try again.', { icon: '⚠️' });
            }
        } catch (err) {
            toast.error('An error occurred while checking Telegram status');
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.warn('Logout request failed, clearing client state anyway');
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');

        setAuthState({
            token: '',
            userEmail: '',
        });

        setFormData({
            email: '',
            password: '',
            phoneNumber: '',
            verificationCode: '',
        });

        setPrices({});
        setSystemMessage('');
        setTelegramStatus({ connected: false, chatId: '' });
        toast('Logged out', { icon: '👋' });
        setView('login');
        navigate('/');
    };

    const isAdmin = (() => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData).role === 'ROLE_ADMIN' : false;
        } catch (e) {
            console.error('Local storage parse error:', e);
            return false;
        }
    })();

    const isAuthView = view === 'signup' || view === 'login' || view === 'otp';

    return (
        <div className="App">
            {isAuthView && (
                <AuthForm
                    view={view}
                    setView={setView}
                    handleSignup={handleSignup}
                    handleLogin={handleLogin}
                    handleVerify={handleVerifyOtp}
                    handleGoogleLogin={handleGoogleLogin}
                    handleChange={handleChange}
                    formData={{
                        ...formData,
                        email: formData?.email || localStorage.getItem('userEmail') || '',
                    }}
                    message={message}
                    setMessage={setMessage}
                    authLoading={authLoading}
                />
            )}

            {view === 'dashboard' && (
                <DashboardShell
                    isAdmin={isAdmin}
                    navigate={navigate}
                    handleLogout={handleLogout}
                    setIsSearchOpen={setIsSearchOpen}
                    setIsSentimentOpen={setIsSentimentOpen}
                    setIsLiquidityOpen={setIsLiquidityOpen}
                    setIsWhaleRadarOpen={setIsWhaleRadarOpen}
                    handleTournamentAccess={handleTournamentAccess}
                    notificationDrawerOpen={notificationDrawerOpen}
                    setNotificationDrawerOpen={setNotificationDrawerOpen}
                    notifications={notifications}
                    notificationUnreadCount={notificationUnreadCount}
                    notificationLoading={notificationLoading}
                    handleMarkNotificationRead={handleMarkNotificationRead}
                    handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                    systemMessage={systemMessage}
                    closeSystemMessage={closeSystemMessage}
                    openPositions={openPositions}
                    watchlist={watchlist}
                    alerts={alerts}
                    prices={prices}
                    expandedCoin={expandedCoin}
                    setExpandedCoin={setExpandedCoin}
                    setIsPortfolioOpen={setIsPortfolioOpen}
                    isPortfolioOpen={isPortfolioOpen}
                    portfolioInput={portfolioInput}
                    setPortfolioInput={setPortfolioInput}
                    addToWatchlist={addToWatchlist}
                    removeFromWatchlist={removeFromWatchlist}
                    isAlertModalOpen={isAlertModalOpen}
                    setIsAlertModalOpen={setIsAlertModalOpen}
                    alertInput={alertInput}
                    setAlertInput={setAlertInput}
                    addAlert={addAlert}
                    handleDeleteClick={handleDeleteClick}
                    deleteTarget={deleteTarget}
                    setDeleteTarget={setDeleteTarget}
                    confirmDelete={confirmDelete}
                    refetchAlerts={refetchAlerts}
                    isTelegramModalOpen={isTelegramModalOpen}
                    setIsTelegramModalOpen={setIsTelegramModalOpen}
                    telegramStatus={telegramStatus}
                    handleTelegramDisconnect={handleTelegramDisconnect}
                    initTelegramConnection={initTelegramConnection}
                    confirmTelegramConnection={confirmTelegramConnection}
                    isSearchOpen={isSearchOpen}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    handleProAnalysis={handleProAnalysis}
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    chartBase64={chartBase64}
                    symbol={symbol}
                    isSentimentOpen={isSentimentOpen}
                    isLiquidityOpen={isLiquidityOpen}
                    isWhaleRadarOpen={isWhaleRadarOpen}
                    handleTickerCoinClick={handleTickerCoinClick}
                />
            )}

            {isTestWarningOpen && (
                <div className="tw-overlay">
                    <div className="tw-modal">
                        <div className="tw-header">
                            <div className="tw-badge">SYSTEM NOTICE</div>

                            <h2 className="tw-title">Testing Environment</h2>

                            <p className="tw-subtitle">
                                This module is currently available for simulation purposes only.
                                Please review the information below before continuing.
                            </p>
                        </div>

                        <div className="tw-panel">
                            <div className="tw-row">
                                <span className="tw-row-label">Environment</span>
                                <span className="tw-row-value">Paper Trading</span>
                            </div>

                            <div className="tw-row">
                                <span className="tw-row-label">Real Funds</span>
                                <span className="tw-row-value">Not Used</span>
                            </div>

                            <div className="tw-row">
                                <span className="tw-row-label">Rewards</span>
                                <span className="tw-row-value">Not Distributed</span>
                            </div>

                            <div className="tw-row">
                                <span className="tw-row-label">Purpose</span>
                                <span className="tw-row-value">System Validation</span>
                            </div>
                        </div>

                        <label className="tw-checkbox">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => setIsChecked((prev) => !prev)}
                            />
                            <span>
                                I understand that this section is for testing purposes and does not involve real trading activity.
                            </span>
                        </label>

                        <div className="tw-actions">
                            <button
                                className="tw-btn tw-btn-secondary"
                                onClick={closeTournamentWarning}
                            >
                                Cancel
                            </button>

                            <button
                                className="tw-btn tw-btn-primary"
                                disabled={!isChecked}
                                onClick={() => {
                                    localStorage.setItem(getTournamentWarningKey(), 'true');
                                    setIsChecked(false);
                                    setIsTestWarningOpen(false);
                                    navigate('/trade-ms');
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {systemMessage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 99999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            background: 'linear-gradient(145deg, #161a1e 0%, #0b0e11 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '20px',
                            padding: '40px',
                            maxWidth: '500px',
                            width: '90%',
                            textAlign: 'center',
                            boxShadow:
                                '0 20px 50px rgba(0,0,0,0.8), 0 0 20px rgba(59, 130, 246, 0.2)',
                        }}
                    >
                        <div style={{ fontSize: '50px', marginBottom: '15px' }}>📢</div>

                        <h2 style={{ color: '#3b82f6', marginBottom: '15px' }}>
                            System Notification
                        </h2>

                        <p style={{ color: '#e2e8f0', marginBottom: '30px' }}>
                            {systemMessage}
                        </p>

                        <button
                            onClick={closeSystemMessage}
                            style={{
                                background: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 30px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            Got it, Thanks
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default User;