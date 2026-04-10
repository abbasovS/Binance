import React, { useCallback, useEffect, useState } from 'react';
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
        localStorage.getItem('token') ? 'dashboard' : 'login'
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



    //ADMIN
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
    const [alertInput, setAlertInput] = useState({symbol: '', targetPrice: ''});
    const [systemMessage, setSystemMessage] = useState('');
    const [telegramStatus, setTelegramStatus] = useState({connected: false, chatId: ''});
    const [prices, setPrices] = useState({});

    // Auth states
    const [message, setMessage] = useState({text: '', type: ''});
    const [authLoading, setAuthLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        phoneNumber: '',
        verificationCode: '',
    });

    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    const {data: watchlist = [], refetch: refetchWatchlist} = useQuery({
        queryKey: ['watchlist'],
        queryFn: () => cryptoApi.getWatchlist().then((res) => res.data),
        enabled: !!token,
    });

    const {data: alerts = [], refetch: refetchAlerts} = useQuery({
        queryKey: ['alerts'],
        queryFn: () => cryptoApi.getAlerts().then((res) => res.data),
        enabled: !!token,
    });

    // 2. YENİ: Açıq pozisiyaları çəkirik
    const { data: openPositions = [] } = useQuery({
        queryKey: ['openPositions'],
        queryFn: () => tradeApi.getActiveTrades().then((res) => res.data), //
        enabled: !!token,
    });

    useQuery({
        queryKey: ['systemInfo'],
        queryFn: () => authApi.getSystemInfo().then((res) => res.data),
        enabled: !!token && !!userEmail,
        refetchInterval: 10000,
        onSuccess: (data) => {
            const msg = data?.globalMessage;
            const storageKey = userEmail ? `lastSeenMessage_${userEmail}` : null;

            if (msg && storageKey && localStorage.getItem(storageKey) !== msg) {
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

    const fetchNotifications = useCallback(async () => {
        if (!token) return;

        try {
            setNotificationLoading(true);

            const [listRes, countRes] = await Promise.all([
                notificationApi.getMyNotifications({ page: 0, size: 20 }),
                notificationApi.getUnreadCount()
            ]);

            setNotifications(listRes?.data?.content || []);
            setNotificationUnreadCount(countRes?.data?.unreadCount || 0);
        } catch (err) {
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
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
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

    useEffect(() => {
        if (view !== 'dashboard' || !token) return;

        // Watchlist, alerts və openPositions-dakı bütün unikal simvolları yığırıq
        const symbols = [
            ...new Set([
                ...(watchlist || []).map((w) => w?.symbol),
                ...(alerts || []).map((a) => a?.symbol),
                ...(openPositions || []).map((p) => p?.symbol), // YENİ: Açıq pozisiyalar bura əlavə edildi
            ]),
        ].filter(Boolean);



        if (symbols.length === 0) return;

        const fetchBatchPrices = async () => {
            try {
                const res = await cryptoApi.getBatchPrices(symbols);
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

                setPrices((prev) => ({...prev, ...newPrices}));
            } catch (err) {
                if (err?.response?.status === 401) return;
                console.error('Batch price fetch xətası:', err);
            }
        };

        fetchBatchPrices();
        const interval = setInterval(fetchBatchPrices, 8000);

        return () => clearInterval(interval);

    }, [view, token, watchlist, alerts, openPositions]);

    useEffect(() => {
        if (!token || view !== 'dashboard') return;

        fetchNotifications();

        const interval = setInterval(() => {
            fetchNotifications();
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchNotifications, token, view]);

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
        if (message.text) setMessage({text: '', type: ''});
    };

    const handleProAnalysis = async (directSymbol = null) => {
        let currentSymbol = (
            typeof directSymbol === 'string' ? directSymbol : searchTerm
        )
            .trim()
            .toUpperCase();

        if (!currentSymbol) {
            toast('Please enter a coin name!', {icon: '⚠️'});
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

    const fetchTelegramStatus = async () => {
        try {
            const res = await authApi.getTelegramStatus();
            setTelegramStatus(res.data || {connected: false, chatId: ''});
        } catch (err) {
            console.error('Telegram status fetch error', err);
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
            toast('Please enter a coin name', {icon: '⚠️'});
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
            console.error('removeFromWatchlist xətası:', err);
            toast.error('An error occurred while removing the coin.');
        }
    };

    const handleGoogleLogin = async (googleResponse) => {
        if (authLoading) return;

        try {
            setAuthLoading(true);
            const response = await authApi.googleLogin(googleResponse.credential);

            if (response.status === 200) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                const data = response.data;
                const receivedToken = data.token;

                if (!receivedToken) throw new Error('Token not received!');

                const payload = JSON.parse(atob(receivedToken.split('.')[1]));
                const userEmailFromToken = payload.sub || payload.email;
                const userRole = payload.role || 'ROLE_USER';

                localStorage.setItem('token', receivedToken);
                localStorage.setItem('userEmail', userEmailFromToken);
                localStorage.setItem(
                    'user',
                    JSON.stringify({
                        id: 1,
                        email: userEmailFromToken,
                        premium: false,
                        role: userRole,
                    })
                );

                toast.success('Google Login successful!');
                setView('dashboard');
            }
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                error.response?.data ||
                'Google Login failed!';
            toast.error(typeof errorMsg === 'string' ? errorMsg : 'Connection error!');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSignup = async (e, fullPhoneNumber) => {
        e.preventDefault();
        if (authLoading) return;

        const email = formData.email?.trim().toLowerCase();
        const password = formData.password;
        const rawPhone = (fullPhoneNumber || formData.phoneNumber)?.replace(/\s/g, '');

        if (!email || email.length < 2 || email.length > 50) {
            return toast.error('Email must be between 2 and 50 characters.');
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
                toast.success('Registration successful! Code sent to your email.');
                setFormData((prev) => ({...prev, verificationCode: ''}));
                setView('otp');
            }
        } catch (error) {
            if (!error.response) {
                toast.error('Sistem hazırda əlçatmazdır (Network Error). Bir az sonra yoxlayın.');
                return;
            }

            const errorData = error.response.data;
            let finalMessage = 'An error occurred during registration!';

            if (typeof errorData === 'string') finalMessage = errorData;
            else if (errorData?.message) finalMessage = errorData.message;
            else if (errorData?.errors) finalMessage = Object.values(errorData.errors)[0];

            const lowerMessage = finalMessage.toLowerCase();

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

        const verificationEmail = formData.email?.trim() || localStorage.getItem('userEmail');
        const normalizedOtp = (formData.verificationCode || '').trim();

        if (!verificationEmail) {
            setView('signup');
            return toast.error('Email not found. Please register again.');
        }

        if (normalizedOtp.length !== 6) {
            return toast('OTP code must be 6 digits.', {icon: '⚠️'});
        }

        try {
            setAuthLoading(true);
            const response = await authApi.verify(verificationEmail, normalizedOtp);

            if (response.status === 200) {
                toast.success('Account verified! You can now log in.');
                setFormData((prev) => ({...prev, verificationCode: ''}));
                setView('login');
            }
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                error.response?.data ||
                'Code is incorrect or expired!';
            toast.error(
                typeof errorMsg === 'string' ? errorMsg : 'Code is incorrect or expired!'
            );
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (authLoading) return;

        const normalizedEmail = formData.email?.trim().toLowerCase();

        if (!normalizedEmail || !formData.password) {
            return toast('Please enter email and password.', {icon: '⚠️'});
        }

        try {
            setAuthLoading(true);
            const response = await authApi.login(normalizedEmail, formData.password);

            if (response.status === 200) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                const data = response.data;
                const receivedToken = data.token || (typeof data === 'string' ? data : null);

                if (!receivedToken) throw new Error('Token not received!');

                localStorage.setItem('token', receivedToken);
                localStorage.setItem('userEmail', normalizedEmail);

                let userRole = 'ROLE_USER';
                try {
                    const payload = JSON.parse(atob(receivedToken.split('.')[1]));
                    userRole = payload.role || 'ROLE_USER';
                } catch (e) {
                    console.error('Token decode error', e);
                }

                localStorage.setItem(
                    'user',
                    JSON.stringify({
                        id: data.id || 1,
                        email: normalizedEmail,
                        premium: data.premium || false,
                        role: userRole,
                    })
                );

                toast.success('Login successful!');
                setFormData({
                    email: '',
                    password: '',
                    phoneNumber: '',
                    verificationCode: '',
                });
                setView('dashboard');
            }
        } catch (error) {
            if (!error.response) {
                toast.error('Sistem hazırda əlçatmazdır (Network Error). Bir az sonra yoxlayın.');
                return;
            }

            const errorData = error.response.data;
            let errorText = 'Incorrect email or password!';

            if (errorData) {
                const backendMessage =
                    errorData.message || (typeof errorData === 'string' ? errorData : '');

                if (
                    backendMessage.toLowerCase().includes('blocked') ||
                    backendMessage.toLowerCase().includes('bloklanıb')
                ) {
                    errorText = 'Your account has been blocked by the admin!';
                } else if (
                    backendMessage.toLowerCase().includes('verify') ||
                    backendMessage.toLowerCase().includes('təsdiq')
                ) {
                    errorText = 'Please verify your email first!';
                } else if (backendMessage) {
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
                chatId: String(telegramStatus.chatId)
            });

            setAlertInput({ symbol: '', targetPrice: '' });
            toast.success('Price alert added successfully!');
            await refetchAlerts();
        } catch (err) {
            console.error('addAlert xətası:', err);

            const serverMessage =
                err?.response?.data?.message ||
                err?.response?.data ||
                'An error occurred while adding the alert!';

            toast.error(typeof serverMessage === 'string' ? serverMessage : 'An error occurred while adding the alert!');
        }
    };
    const initTelegramConnection = async () => {
        try {
            const res = await authApi.initTelegramConnection();
            const connectUrl = res.data?.connectUrl;

            if (!connectUrl) {
                return toast.error('Telegram bağlantısı yaradıla bilmədi');
            }

            const telegramWindow = window.open(connectUrl, '_blank', 'noopener,noreferrer');

            if (
                !telegramWindow ||
                telegramWindow.closed ||
                typeof telegramWindow.closed === 'undefined'
            ) {
                toast.success('Yönləndirilirsiniz...', {icon: '🔄'});
                setTimeout(() => {
                    window.location.href = connectUrl;
                }, 1000);
            }
        } catch (err) {
            toast.error('Telegram linki alınarkən xəta baş verdi');
        }
    };

    const confirmTelegramConnection = async () => {
        try {
            const res = await authApi.confirmTelegramConnection();
            setTelegramStatus(res.data || {connected: false, chatId: ''});

            if (res.data?.connected) {
                toast.success('Telegram connected successfully');
                setIsTelegramModalOpen(false);
            } else {
                toast('Connection not found yet. Please try again.', {icon: '⚠️'});
            }
        } catch (err) {
            toast.error('An error occurred while checking Telegram status');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');

        setFormData({
            email: '',
            password: '',
            phoneNumber: '',
            verificationCode: '',
        });

        setPrices({});
        setSystemMessage('');
        toast('Logged out', {icon: '👋'});
        setView('login');
        navigate('/');
    };

    const isAdmin = (() => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData).role === 'ROLE_ADMIN' : false;
        } catch (e) {
            console.error('Local storage parse xətası:', e);
            return false;
        }
    })();

    const isAuthView = view === 'signup' || view === 'login' || view === 'otp';

    return (
        <div className="App">
            {/* AUTH */}
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

            {/* DASHBOARD */}
            {view === 'dashboard' && (
                <DashboardShell
                    isAdmin={isAdmin}
                    navigate={navigate}
                    handleLogout={handleLogout}

                    // modallar
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

                    // data
                    watchlist={watchlist}
                    alerts={alerts}
                    prices={prices}

                    // state
                    expandedCoin={expandedCoin}
                    setExpandedCoin={setExpandedCoin}

                    // portfolio
                    setIsPortfolioOpen={setIsPortfolioOpen}
                    isPortfolioOpen={isPortfolioOpen}
                    portfolioInput={portfolioInput}
                    setPortfolioInput={setPortfolioInput}
                    addToWatchlist={addToWatchlist}
                    removeFromWatchlist={removeFromWatchlist}

                    // alert
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

                    // telegram
                    isTelegramModalOpen={isTelegramModalOpen}
                    setIsTelegramModalOpen={setIsTelegramModalOpen}
                    telegramStatus={telegramStatus}
                    handleTelegramDisconnect={handleTelegramDisconnect}
                    initTelegramConnection={initTelegramConnection}
                    confirmTelegramConnection={confirmTelegramConnection}

                    // search / analysis
                    isSearchOpen={isSearchOpen}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    handleProAnalysis={handleProAnalysis}

                    // chart modal
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    chartBase64={chartBase64}
                    symbol={symbol}

                    // digər modallar
                    isSentimentOpen={isSentimentOpen}
                    isLiquidityOpen={isLiquidityOpen}
                    isWhaleRadarOpen={isWhaleRadarOpen}
                />
            )}

            {/* TEST WARNING MODAL */}
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

            {/* SYSTEM MESSAGE */}
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
                        <div style={{fontSize: '50px', marginBottom: '15px'}}>📢</div>

                        <h2 style={{color: '#3b82f6', marginBottom: '15px'}}>
                            System Notification
                        </h2>

                        <p style={{color: '#e2e8f0', marginBottom: '30px'}}>
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