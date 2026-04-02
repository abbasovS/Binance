import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import '../../../shared/styles/App.css';
import '../../../shared/styles/Auth.css';
import FearGreedIndex from '../components/FearGreedIndex';
import AnalysisModal from '../components/AnalysisModal';
import AuthForm from '../components/AuthForm';
import * as ST from '../components/UserStyles';
import { authApi, cryptoApi } from '../../../api';
import { useNavigate } from 'react-router-dom';
import '../../../shared/styles/Trade.css';
import ArenaNewsBoard from '../../trade/components/ArenaNewsBoard';
import { LiquidityMapModal, WhaleRadarModal } from '../components/HeatMapAndWhaleRadar';
import { useQuery } from '@tanstack/react-query';
import TickerBar from '../components/TickerBar';

function User() {
    const navigate = useNavigate();

    // UI State-ləri
    const [view, setView] = useState(() => localStorage.getItem('token') ? 'dashboard' : 'login');
    const [isLiquidityOpen, setIsLiquidityOpen] = useState(false);
    const [isTestWarningOpen, setIsTestWarningOpen] = useState(false);
    const [isWhaleRadarOpen, setIsWhaleRadarOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
    const [isSentimentOpen, setIsSentimentOpen] = useState(false);

    // Data State-ləri
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [expandedCoin, setExpandedCoin] = useState(null);
    const [chartBase64, setChartBase64] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [symbol, setSymbol] = useState("BTCUSDT");
    const [portfolioInput, setPortfolioInput] = useState('');
    const [alertInput, setAlertInput] = useState({ symbol: '', targetPrice: '' });
    const [systemMessage, setSystemMessage] = useState("");
    const [telegramStatus, setTelegramStatus] = useState({ connected: false, chatId: '' });
    const [prices, setPrices] = useState({});

    // Auth State-ləri
    const [message, setMessage] = useState({ text: '', type: '' });
    const [authLoading, setAuthLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '', password: '', phoneNumber: '', verificationCode: ''
    });

    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    // --- REACT QUERY İLƏ DATA ÇƏKİLMƏSİ ---
    const { data: watchlist = [], refetch: refetchWatchlist } = useQuery({
        queryKey: ['watchlist'],
        queryFn: () => cryptoApi.getWatchlist().then(res => res.data),
        enabled: !!token,
    });

    const { data: alerts = [], refetch: refetchAlerts } = useQuery({
        queryKey: ['alerts'],
        queryFn: () => cryptoApi.getAlerts().then(res => res.data),
        enabled: !!token,
    });

    // SENIOR DÜZƏLİŞİ 1: System Info-nu da React Query ilə çəkirik (setInterval ləğv edildi)
    useQuery({
        queryKey: ['systemInfo'],
        queryFn: () => authApi.getSystemInfo().then(res => res.data),
        enabled: !!token && !!userEmail,
        refetchInterval: 10000, // Avtomatik hər 10 saniyədən bir arxa planda yeniləyir
        onSuccess: (data) => {
            const msg = data?.globalMessage;
            const storageKey = `lastSeenMessage_${userEmail}`;
            if (msg && localStorage.getItem(storageKey) !== msg) {
                setSystemMessage(msg);
            }
        }
    });

    const closeSystemMessage = () => {
        const storageKey = `lastSeenMessage_${userEmail}`; // Əgər userEmail yoxdursa, bunu sadəcə "lastSeenMessage" edə bilərsən
        localStorage.setItem(storageKey, systemMessage);
        setSystemMessage("");
    };

    // 1. YALNIZ SƏHİFƏ YÖNLƏNDİRMƏSİ (ROUTING) ÜÇÜN
    useEffect(() => {
        if (token && (view === 'login' || view === 'signup' || view === 'otp')) {
            setView('dashboard');
        } else if (!token && view === 'dashboard') {
            setView('login');
        }
    }, [token, view]);

    // 2. YALNIZ CANLI DATA VƏ WEBSOCKET ÜÇÜN
// 2. YALNIZ CANLI DATA VƏ WEBSOCKET ÜÇÜN
    // ESKİ useEffect-i (view, token, websocket) SİL, BU İLƏ ƏVƏZ ET:

    useEffect(() => {
        if (view !== 'dashboard' || !token) return;

        // Watchlist + alertdən unikal symbolları topla
        const symbols = [...new Set([
            ...watchlist.map(w => w.symbol),
            ...alerts.map(a => a.symbol)
        ])];

        if (symbols.length === 0) return; // Heç nə yoxdursa sorğu atma

        const fetchBatchPrices = async () => {
            try {
                const res = await cryptoApi.getBatchPrices(symbols);
                const newPrices = {};

                res.data.forEach(item => {
                    // Backend-dən gələn bütün sahələri saxlayırıq
                    const coinData = {
                        symbol: item.symbol,
                        price: item.price,
                        change: item.change,
                        high: item.high,
                        low: item.low,
                        volume: item.volume,
                        baseVolume: item.baseVolume,
                        vwap: item.vwap,
                        priceChangeAmt: item.priceChangeAmt
                    };
                    newPrices[item.symbol] = coinData;
                    if (item.symbol) {
                        newPrices[item.symbol.replace('USDT', '')] = coinData;
                    }
                });

                setPrices(prev => ({ ...prev, ...newPrices }));
            } catch (err) {
                console.error("Batch price fetch xətası:", err);
            }
        };

        fetchBatchPrices();                          // İlk dəfə dərhal çək
        const interval = setInterval(fetchBatchPrices, 8000); // Hər 8s bir sorğu

        return () => clearInterval(interval);
    }, [view, token, watchlist, alerts]); // watchlist/alerts dəyişəndə avtomatik yenilənir
    // Qalan köməkçi funksiyalar olduğu kimi qalır...
    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
        if (message.text) setMessage({text: '', type: ''});
    };

    const handleProAnalysis = async (directSymbol = null) => {
        let currentSymbol = (typeof directSymbol === 'string' ? directSymbol : searchTerm).trim().toUpperCase();

        if (!currentSymbol) {
            toast("Please enter a coin name!", { icon: '⚠️' });
            return;
        }

        if (!currentSymbol.endsWith("USDT")) currentSymbol += "USDT";

        setIsSearchOpen(false);
        setSymbol(currentSymbol);
        setIsModalOpen(true);
        setChartBase64(null);

        try {
            const response = await cryptoApi.generateAnalysis(currentSymbol);
            if (response.data?.chart) setChartBase64(response.data.chart);
        } catch (error) {
            setIsModalOpen(false);
            toast.error("Analysis not found for this coin.");
        }
    };

    const handleTelegramDisconnect = async () => {
        if (!window.confirm("Are you sure you want to disconnect Telegram?")) return;
        try {
            await authApi.disconnectTelegram();
            await fetchTelegramStatus();
            toast.success("Disconnected successfully.");
        } catch (err) {
            toast.error("An error occurred while disconnecting.");
        }
    };

    const addToWatchlist = async () => {
        if (!portfolioInput || portfolioInput.trim() === "") {
            toast("Please enter a coin name", { icon: '⚠️' });
            return;
        }

        try {
            let symbol = portfolioInput.trim().toUpperCase();
            const formattedSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

            if (watchlist.some(item => item.symbol === formattedSymbol)) {
                setPortfolioInput('');
                return;
            }

            const response = await cryptoApi.addToWatchlist(formattedSymbol);
            if (response.status === 200 || response.status === 201) {
                toast.success("Coin added to portfolio!");
                await refetchWatchlist();
                setPortfolioInput('');
            }
        } catch (err) {
            toast.error("An error occurred while adding to watchlist.");
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
                const token = data.token;

                if (!token) throw new Error("Token not received!");

                const payload = JSON.parse(atob(token.split('.')[1]));
                const userEmailFromToken = payload.sub || payload.email; // Sənin JWT sub hissəsində email saxlayırsa
                const userRole = payload.role || 'ROLE_USER';

                localStorage.setItem('token', token);
                localStorage.setItem('userEmail', userEmailFromToken);
                localStorage.setItem('user', JSON.stringify({
                    id: 1, email: userEmailFromToken, premium: false, role: userRole
                }));

                toast.success('Google Login successful!');
                setView('dashboard');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || "Google Login failed!";
            toast.error(typeof errorMsg === 'string' ? errorMsg : "Connection error!");
        } finally {
            setAuthLoading(false);
        }
    };

    const removeFromWatchlist = async (symbol) => {
        if (!symbol) return;
        try {
            await cryptoApi.removeFromWatchlist(symbol);
            toast.success(`${symbol} removed from portfolio.`);
            await refetchWatchlist();
        } catch (err) {
            toast.error("An error occurred while removing the    coin.");
        }
    };

    // --- AUTH VƏ DİGƏR FUNKSİYALAR ---

    // DİQQƏT: normalizeAzPhoneNumber buradan silindi, çünki AuthForm.jsx bunu artıq edir!

    const handleSignup = async (e, fullPhoneNumber) => {
        e.preventDefault();
        if (authLoading) return;

        const email = formData.email?.trim().toLowerCase();
        const password = formData.password;
        const rawPhone = (fullPhoneNumber || formData.phoneNumber)?.replace(/\s/g, '');

        if (!email || email.length < 2 || email.length > 50) return toast.error('Email must be between 2 and 50 characters.');

        const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$/;
        if (!password || password.length < 8 || !passwordRegex.test(password)) {
            return toast.error('Password must be at least 8 characters, including uppercase, lowercase, and numbers.');
        }

        const phoneRegex = /^\+[1-9]\d{6,14}$/;
        if (!phoneRegex.test(rawPhone)) return toast.error('Enter a valid phone number (e.g., +994501234567)');

        try {
            setAuthLoading(true);
            const response = await authApi.signup({ email, password, phoneNumber: rawPhone });

            if (response.status === 200 || response.status === 201) {
                localStorage.setItem('userEmail', email);
                toast.success('Registration successful! Code sent to your email.');
                setFormData(prev => ({ ...prev, verificationCode: '' }));
                setView('otp');
            }
        } catch (error) {
            // SENIOR DÜZƏLİŞİ: Server tamamilə çökübsə (503, Network Error)
            if (!error.response) {
                toast.error("Sistem hazırda əlçatmazdır (Network Error). Bir az sonra yoxlayın.");
                return;
            }

            const errorData = error.response.data;
            let finalMessage = "An error occurred during registration!";

            if (typeof errorData === 'string') finalMessage = errorData;
            else if (errorData?.message) finalMessage = errorData.message;
            else if (errorData?.errors) finalMessage = Object.values(errorData.errors)[0];

            const lowerMessage = finalMessage.toLowerCase();
            if (lowerMessage.includes("already exists") || lowerMessage.includes("duplicate")) {
                finalMessage = lowerMessage.includes("email") ? "Email already exists."
                    : lowerMessage.includes("phone") ? "Phone Number already exists."
                        : "This data already exists.";
            }

            toast.error(finalMessage);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleDeleteClick = (item) => setDeleteTarget(item);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget.id || deleteTarget.alertId || deleteTarget._id;
        try {
            await cryptoApi.deleteAlert(id);
            setDeleteTarget(null);
            toast.success("Alert deleted successfully.");
            await refetchAlerts();
        } catch (err) {
            toast.error("Server could not delete this ID.");
        }
    };

    const addAlert = async () => {
        if (!alertInput.symbol || !alertInput.targetPrice) return toast("Please fill in all fields!", { icon: '⚠️' });

        try {
            let sym = alertInput.symbol.toUpperCase();
            const formattedSymbol = sym.endsWith('USDT') ? sym : `${sym}USDT`;
            await cryptoApi.addAlert({ symbol: formattedSymbol, targetPrice: alertInput.targetPrice });
            setAlertInput({ symbol: '', targetPrice: '' });
            toast.success("Price alert added successfully!");
            await refetchAlerts();
        } catch (err) {
            toast.error("An error occurred while adding the alert!");
        }
    };

    const fetchTelegramStatus = async () => {
        try {
            const res = await authApi.getTelegramStatus();
            setTelegramStatus(res.data || { connected: false, chatId: '' });
        } catch (err) {
            console.error("Telegram status fetch error", err);
        }
    };

    const initTelegramConnection = async () => {
        try {
            const res = await authApi.initTelegramConnection();
            const connectUrl = res.data?.connectUrl;
            if (!connectUrl) return toast.error('Telegram bağlantısı yaradıla bilmədi');

            const telegramWindow = window.open(connectUrl, '_blank', 'noopener,noreferrer');
            if (!telegramWindow || telegramWindow.closed || typeof telegramWindow.closed === 'undefined') {
                toast.success("Yönləndirilirsiniz...", { icon: '🔄' });
                setTimeout(() => window.location.href = connectUrl, 1000);
            }
        } catch (err) {
            toast.error('Telegram linki alınarkən xəta baş verdi');
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

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (authLoading) return;

        const verificationEmail = formData.email?.trim() || localStorage.getItem('userEmail');
        const normalizedOtp = (formData.verificationCode || '').trim();

        if (!verificationEmail) {
            setView('signup');
            return toast.error('Email not found. Please register again.');
        }
        if (normalizedOtp.length !== 6) return toast('OTP code must be 6 digits.', { icon: '⚠️' });

        try {
            setAuthLoading(true);
            const response = await authApi.verify(verificationEmail, normalizedOtp);
            if (response.status === 200) {
                toast.success('Account verified! You can now log in.');
                setFormData(prev => ({ ...prev, verificationCode: '' }));
                setView('login');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || 'Code is incorrect or expired!';
            toast.error(typeof errorMsg === 'string' ? errorMsg : 'Code is incorrect or expired!');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (authLoading) return;

        const normalizedEmail = formData.email?.trim().toLowerCase();
        if (!normalizedEmail || !formData.password) return toast('Please enter email and password.', { icon: '⚠️' });

        try {
            setAuthLoading(true);
            const response = await authApi.login(normalizedEmail, formData.password);

            if (response.status === 200) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                const data = response.data;
                const token = data.token || (typeof data === 'string' ? data : null);

                if (!token) throw new Error("Token not received!");

                localStorage.setItem('token', token);
                localStorage.setItem('userEmail', normalizedEmail);

                let userRole = 'ROLE_USER';
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userRole = payload.role || 'ROLE_USER';
                } catch (e) {
                    console.error("Token decode error", e);
                }

                localStorage.setItem('user', JSON.stringify({
                    id: data.id || 1, email: normalizedEmail, premium: data.premium || false, role: userRole
                }));

                toast.success('Login successful!');
                setFormData({ email: '', password: '', phoneNumber: '', verificationCode: '' });
                setView('dashboard');
            }
        } catch (error) {
            // SENIOR DÜZƏLİŞİ: Network Error yoxlaması
            if (!error.response) {
                toast.error("Sistem hazırda əlçatmazdır (Network Error). Bir az sonra yoxlayın.");
                return;
            }

            const errorData = error.response.data;
            let errorText = "Incorrect email or password!";

            if (errorData) {
                const backendMessage = errorData.message || (typeof errorData === 'string' ? errorData : "");
                if (backendMessage.toLowerCase().includes("blocked") || backendMessage.toLowerCase().includes("bloklanıb")) {
                    errorText = "Your account has been blocked by the admin!";
                } else if (backendMessage.toLowerCase().includes("verify") || backendMessage.toLowerCase().includes("təsdiq")) {
                    errorText = "Please verify your email first!";
                } else if (backendMessage) {
                    errorText = backendMessage;
                }
            }

            toast.error(errorText);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        setFormData({ email: '', password: '', phoneNumber: '', verificationCode: '' });

        toast("Logged out", { icon: '👋' });

        setView('login');
        window.location.href = "/"; // Səhifəni tam təmizləyərək loginə atır
    };

    // SENIOR DÜZƏLİŞİ: Admin yoxlamasını Təhlükəsiz (Safe) formata salırıq.
    // Əgər localStorage-də data korlanıbsa, sayt çökməyəcək.
    const isAdmin = (() => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData).role === 'ROLE_ADMIN' : false;
        } catch (e) {
            console.error("Local storage parse xətası:", e);
            return false;
        }
    })();

    // AuthForm-u göstərmək üçün ortaq şərt (Signup, Login və ya OTP olduqda)
    const isAuthView = view === 'signup' || view === 'login' || view === 'otp';

    return (
        <div className="App">
            {/* 1. LOGIN, SIGNUP VƏ OTP EKRANI */}
            {isAuthView && (
                <AuthForm
                    view={view}
                    setView={setView}
                    handleSignup={handleSignup}
                    handleLogin={handleLogin}
                    handleVerify={handleVerifyOtp}
                    handleGoogleLogin={handleGoogleLogin} // <-- YENİ ƏLAVƏ EDİLƏN
                    handleChange={handleChange}
                    formData={formData}
                    message={message}
                    setMessage={setMessage}
                    authLoading={authLoading}
                />
            )}

            {/* 2. DASHBOARD */}
            {view === 'dashboard' && (
                <div style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: '100vh',
                    background: '#0b0e11',
                    display: 'flex',
                    flexDirection: 'column'
                }}>

                    {/* --- PREMIUM NAVBAR --- */}
                    <div style={{
                        width: '100%',
                        height: '64px', // Bir az daha genişlətdik ki, premium görünsün
                        background: 'rgba(2, 6, 23, 0.65)', // Sənin bg-dark rənginə uyğun şüşə
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 40px',
                        boxSizing: 'border-box',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000,
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' // Daha dərin kölgə
                    }}>
                        {/* SOL TƏRƏF: LOGO VƏ MENYU LİNKLƏRİ */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '50px', height: '100%' }}>

                            {/* TYPOGRAPHY LOGO (MockFolio) */}
                            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <span style={{
                            fontSize: '22px',
                            fontWeight: '800',
                            color: '#ffffff',
                            letterSpacing: '-0.5px'
                        }}>
                            Mock
                        </span>
                                <span style={{
                                    fontSize: '22px',
                                    fontWeight: '800',
                                    color: '#3b82f6', // Premium Mavi
                                    letterSpacing: '-0.5px',
                                    textShadow: '0 0 15px rgba(59, 130, 246, 0.4)' // Neon effekti
                                }}>
                            Folio
                        </span>
                                <div style={{
                                    width: '6px', height: '6px', background: '#02c076', borderRadius: '50%',
                                    marginLeft: '4px', marginBottom: '12px', boxShadow: '0 0 8px #02c076'
                                }}></div> {/* Kiçik canlılıq nöqtəsi */}
                            </div>

                            {/* MENYU LİNKLƏRİ */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '35px', height: '100%', marginLeft: '20px' }}>
                                {['Analysis', 'Sentiment', 'Liquidity Map', 'Whale Radar'].map((item, idx) => {
                                    const action =
                                        item === 'Analysis' ? () => setIsSearchOpen(true) :
                                            item === 'Sentiment' ? () => setIsSentimentOpen(true) :
                                                item === 'Liquidity Map' ? () => setIsLiquidityOpen(true) :
                                                    () => setIsWhaleRadarOpen(true);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={action}
                                            style={{
                                                background: 'transparent', border: 'none', height: '100%',
                                                fontSize: '13px', fontWeight: '600', color: '#94a3b8', cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                letterSpacing: '0.5px', textTransform: 'uppercase',
                                                position: 'relative', display: 'flex', alignItems: 'center'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.color = '#ffffff';
                                                e.currentTarget.style.textShadow = '0 0 12px rgba(255,255,255,0.3)';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.color = '#94a3b8';
                                                e.currentTarget.style.textShadow = 'none';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}

                                {/* 🛡️ ADMIN DÜYMƏSİ */}
                                {isAdmin && (
                                    <button
                                        onClick={() => navigate('/admin')}
                                        style={{
                                            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                                            height: '32px', padding: '0 16px', fontSize: '11px', fontWeight: '700',
                                            color: '#3b82f6', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s ease',
                                            letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                            e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.2)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <span style={{ fontSize: '14px' }}>🛡️</span> Admin
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SAĞ TƏRƏF: PROFİL VƏ ÇIXIŞ */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)', // Qradiyent profil ikonu
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
                                }}>
                                    {localStorage.getItem('userEmail') ? localStorage.getItem('userEmail')[0].toUpperCase() : 'U'}
                                </div>
                                <span style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '600', letterSpacing: '0.3px' }}>
                            {localStorage.getItem('userEmail') || "user@mockfolio.com"}
                        </span>
                            </div>

                            {/* ÇIXIŞ DÜYMƏSİ */}
                            <button
                                onClick={handleLogout}
                                title="Log Out"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(248, 73, 96, 0.3)',
                                    color: '#f84960',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(248, 73, 96, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(248, 73, 96, 0.6)';
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(248, 73, 96, 0.15)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'rgba(248, 73, 96, 0.3)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Log Out <span style={{ fontSize: '14px', marginTop: '-1px' }}>⏻</span>
                            </button>
                        </div>
                    </div>
                    <TickerBar />

            {/* --- ƏSAS MƏZMUN (DARK MODE) --- */}
            <div style={{padding: '20px 30px', flex: 1}}>
                <div style={{
                    display: 'flex', gap: '30px', alignItems: 'flex-start', height: 'calc(100vh - 90px)'
                }}>

                    {/* --- SOL SIDEBAR --- (ARENA və Xəbərlər) */}
                    <div style={{
                        flex: '0 0 320px',
                        height: '100%',
                        background: '#0d1117',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '20px', // 24px-dən 20px-ə endirildi (daha kompakt)
                        gap: '20px',     // Qutular arası boşluq azaldıldı
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                    }}>

                        {/* TOURNAMENT ARENA */}
                        <div
                            onClick={() => setIsTestWarningOpen(true)}
                            style={{
                                cursor: 'pointer',
                                position: 'relative',
                                padding: '20px', // Daxili boşluq azaldıldı (24 -> 20)
                                background: 'linear-gradient(145deg, #11151c 0%, #090b0f 100%)',
                                borderRadius: '16px',
                                border: '1px solid rgba(212, 175, 55, 0.15)',
                                transition: 'all 0.3s ease',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '145px', // Hündürlük bir az azaldıldı ki, qəzetə yer qalsın
                                flexShrink: 0,
                                boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.border = '1px solid rgba(212, 175, 55, 0.4)';
                                e.currentTarget.style.boxShadow = '0 12px 35px rgba(212, 175, 55, 0.1)';
                                e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(5px)';
                                e.currentTarget.querySelector('.trophy-icon').style.transform = 'scale(1.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.border = '1px solid rgba(212, 175, 55, 0.15)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
                                e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(0)';
                                e.currentTarget.querySelector('.trophy-icon').style.transform = 'scale(1)';
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 0, right: 0, width: '100px', height: '100px',
                                background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)',
                                pointerEvents: 'none'
                            }}/>

                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <span style={{
                color: '#d4af37',
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '1.5px',
                textTransform: 'uppercase'
            }}>
                Exclusive Event
            </span>
                                <div className="trophy-icon" style={{
                                    fontSize: '20px',
                                    transition: 'transform 0.4s ease',
                                    filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))'
                                }}>
                                    🏆
                                </div>
                            </div>

                            <div style={{marginTop: '12px'}}>
                                <h3 style={{
                                    margin: '0 0 8px 0',
                                    color: '#ffffff',
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px'
                                }}>
                                    Paper Tournament
                                </h3>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '10px',
                                    padding: '5px 10px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    width: 'fit-content'
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <span style={{fontSize: '12px'}}>🥇</span>
                                        <span style={{color: '#d4af37', fontSize: '11px', fontWeight: '800'}}>$100</span>
                                    </div>
                                    <div style={{ width: '3px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <span style={{fontSize: '12px'}}>🥈</span>
                                        <span style={{color: '#cbd5e1', fontSize: '11px', fontWeight: '800'}}>$50</span>
                                    </div>
                                    <div style={{ width: '3px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <span style={{fontSize: '12px'}}>🥉</span>
                                        <span style={{color: '#cd7f32', fontSize: '11px', fontWeight: '800'}}>$25</span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#8b949e',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Enter Arena
                                    <span className="arrow-icon" style={{
                                        color: '#d4af37',
                                        transition: 'transform 0.3s ease',
                                        fontSize: '14px'
                                    }}>→</span>
                                </div>
                            </div>
                        </div>

                        {/* YENİLƏNMİŞ VƏ YUXARI ÇƏKİLMİŞ MARKET GAZETTE BAŞLIĞI */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'transparent',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            paddingTop: '16px', // 25px-dən 16px-ə endirildi (Çox yuxarı qalxdı)
                            marginTop: '0',     // Əlavə 10px margin ləğv edildi
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '10px', // 15px-dən 10px-ə endirildi (Qəzet daha da yuxarı qalxdı)
                                padding: '0 4px'
                            }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    {/* Zərif nöqtə */}
                                    <div style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: '#d4af37',
                                        boxShadow: '0 0 8px rgba(212,175,55,0.4)',
                                        animation: 'pulse 3s infinite'
                                    }}/>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#9ca3af', // Bir az daha açıq və oxunaqlı boz
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase'
                                    }}>
                    Market Gazette
                </span>
                                </div>

                                {/* Zərif "LIVE FEED" etiketi */}
                                <div style={{
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    color: '#8b949e',
                                    letterSpacing: '1px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255,255,255,0.03)'
                                }}>
                                    LIVE FEED
                                </div>
                            </div>

                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                /* Maskanı azaltdım ki, qəzetin kənarları çox görünməz olmasın */
                                maskImage: 'linear-gradient(to bottom, transparent, black 2%, black 98%, transparent)',
                                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 2%, black 98%, transparent)',
                                padding: '4px'
                            }} className="custom-scrollbar">
                                <ArenaNewsBoard compact/>
                            </div>
                        </div>

                        <style>
                            {`
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
`}
                        </style>
                    </div>

                    {/* --- SAĞ PANEL - MƏRKƏZİ İZLƏMƏ LÖVHƏSİ (COMBINED WATCHBOARD) --- */}
                    <div style={{
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: '0',
                        height: '100%',
                        background: '#12161a', // Rəng açıldı (Əvvəlki ideal tünd boz)
                        borderRadius: '16px',
                        border: '1px solid #2b3139',
                        overflow: 'hidden',
                        padding: '30px',
                        position: 'relative'
                    }}>
                        {/* Başlıq Hissəsi */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '30px'
                        }}>
                            <div>
                                <h2 style={{ color: '#ffffff', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
                                    Command Center
                                </h2>

                                <p style={{ color: '#848e9c', margin: 0, fontSize: '13px', fontWeight: '500' }}>
                                    Your portfolio and active alerts in one place
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => { setIsAlertModalOpen(true); refetchAlerts(); }}
                                    style={{
                                        background: 'rgba(252, 213, 53, 0.1)', color: '#fcd535', border: '1px solid rgba(252, 213, 53, 0.2)',
                                        padding: '10px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(252, 213, 53, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(252, 213, 53, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    + Alert
                                </button>
                                <button
                                    onClick={() => setIsPortfolioOpen(true)}
                                    style={{
                                        background: '#3b82f6', color: '#ffffff', border: 'none',
                                        padding: '10px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    + Portfolio
                                </button>
                                <button
                                    onClick={() => setIsTelegramModalOpen(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        background: 'linear-gradient(135deg, rgba(42, 171, 238, 0.15) 0%, rgba(42, 171, 238, 0.05) 100%)',
                                        color: '#2AABEE',
                                        border: '1px solid rgba(42, 171, 238, 0.3)',
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 171, 238, 0.25) 0%, rgba(42, 171, 238, 0.1) 100%)';
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                        e.currentTarget.style.borderColor = 'rgba(42, 171, 238, 0.6)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(42, 171, 238, 0.2)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 171, 238, 0.15) 0%, rgba(42, 171, 238, 0.05) 100%)';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.borderColor = 'rgba(42, 171, 238, 0.3)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                                    }}
                                >
                                    {/* Telegram Orijinal SVG Loqosu */}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21.5 2L2 9.5L8.5 12.5L18.5 5.5L11 13.5L11.5 19L15 15.5L20 19.5L21.5 2Z" fill="currentColor" />
                                    </svg>
                                    TELEGRAM
                                </button>
                            </div>
                        </div>
                        {/* KARTLARIN SİYAHISI */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                            {(() => {
                                const combinedSymbols = Array.from(new Set([
                                    ...(watchlist || []).map(w => w.symbol),
                                    ...(alerts || []).map(a => a.symbol)
                                ]));

                                if (combinedSymbols.length === 0) {
                                    return (
                                        <div style={{
                                            minHeight: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-start',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            padding: '24px 20px 20px 20px'
                                        }}>
                                            {/* RADAR İKON */}
                                            <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '24px' }}>
                                                <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="36" cy="36" r="35" stroke="#1e2530" strokeWidth="1.5"/>
                                                    <circle cx="36" cy="36" r="26" stroke="#1e2d3d" strokeWidth="1" strokeDasharray="3 4"/>
                                                    <circle cx="36" cy="36" r="16" stroke="#1e3a52" strokeWidth="1"/>
                                                    <circle cx="36" cy="36" r="4" fill="#3b82f6"/>
                                                    <circle cx="36" cy="36" r="2" fill="#60a5fa"/>
                                                    <line x1="36" y1="20" x2="36" y2="28" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
                                                    <line x1="36" y1="44" x2="36" y2="52" stroke="#1e3a52" strokeWidth="1" strokeLinecap="round"/>
                                                    <line x1="20" y1="36" x2="28" y2="36" stroke="#1e3a52" strokeWidth="1" strokeLinecap="round"/>
                                                    <line x1="44" y1="36" x2="52" y2="36" stroke="#1e3a52" strokeWidth="1" strokeLinecap="round"/>
                                                </svg>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-4px',
                                                    right: '-4px',
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    background: '#3b82f6',
                                                    border: '2px solid #12161a',
                                                    animation: 'pulse 2s infinite'
                                                }}/>
                                            </div>

                                            {/* BAŞLIQ */}
                                            <div style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '600' }}>
                                                System standby
                                            </div>
                                            <p style={{ color: '#94a3b8', margin: '0 0 36px 0', fontSize: '14px', maxWidth: '340px', lineHeight: '1.7', fontWeight: '400' }}>
                                                Add assets to your portfolio or set price alerts to activate the monitoring engine.
                                            </p>

                                            {/* 3 MINI KART */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, 1fr)',
                                                gap: '1px',
                                                background: '#1e2530',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                width: '100%',
                                                maxWidth: '480px',
                                                marginBottom: '36px'
                                            }}>
                                                {/* Price Alerts */}
                                                <div style={{ background: '#0f1318', padding: '20px 16px', textAlign: 'left' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2,192,118,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#02c076" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                                                            <polyline points="16 7 22 7 22 13"/>
                                                        </svg>
                                                    </div>
                                                    <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Price alerts</div>
                                                    <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.5' }}>Custom targets, instant ping</div>
                                                </div>

                                                {/* Volatility */}
                                                <div style={{ background: '#0f1318', padding: '20px 16px', textAlign: 'left' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(248,73,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f84960" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                                        </svg>
                                                    </div>
                                                    <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Volatility</div>
                                                    <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.5' }}>Pumps, dumps & spikes</div>
                                                </div>

                                                {/* Telegram */}
                                                <div style={{ background: '#0f1318', padding: '20px 16px', textAlign: 'left' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(42,171,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 2L11 13"/>
                                                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                                        </svg>
                                                    </div>
                                                    <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Telegram</div>
                                                    <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.5' }}>Alerts sent directly to you</div>
                                                </div>
                                            </div>

                                            {/* TELEGRAM HINT */}
                                            <div style={{
                                                width: '100%',
                                                maxWidth: '480px',
                                                border: '1px dashed #1e2d3d',
                                                borderRadius: '10px',
                                                padding: '18px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '14px',
                                                textAlign: 'left'
                                            }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(59,130,246,0.08)',
                                                    border: '1px solid rgba(59,130,246,0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: '0'
                                                }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="10"/>
                                                        <line x1="12" y1="8" x2="12" y2="12"/>
                                                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                                                    </svg>
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '11px', lineHeight: '1.6' }}>
                                                    Connect your <span style={{ color: '#2AABEE', fontWeight: '600' }}>Telegram</span> account to receive real-time alerts the moment your conditions are triggered.
                                                </div>
                                            </div>

                                            {/* PULSE ANİMASİYA */}
                                            <style>{`
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
        `}</style>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '15px'
                                    }}>
                                        {combinedSymbols.map((sym, index) => {
                                            const upperSym = sym.toUpperCase();
                                            const cleanLogoSym = upperSym.replace('USDT', '').toLowerCase().trim();
                                            const symWithUsdt = upperSym.endsWith('USDT') ? upperSym : upperSym + 'USDT';
                                            const pureSym = upperSym.replace('USDT', '');

                                            const inPortfolio = (watchlist || []).some(w => w.symbol.toUpperCase() === upperSym);
                                            const coinAlerts = (alerts || []).filter(a => a.symbol.toUpperCase() === upperSym);

                                            const data = prices ? (prices[upperSym] || prices[symWithUsdt] || prices[pureSym]) : null;

                                            const currentPrice = data ? (data.price || data.c) : null;
                                            const change = data ? (data.change || data.P) : null;
                                            const high = data ? (data.high || data.h) : null;
                                            const low = data ? (data.low || data.l) : null;

                                            const volume = data ? (data.volume || data.q) : null;
                                            const priceChangeAmt = data ? (data.priceChangeAmt || data.priceChange || data.p) : null;
                                            const baseVolume = data ? (data.baseVolume || data.v) : null;
                                            const vwap = data ? (data.vwap || data.w) : null;

                                            const isPositive = parseFloat(change) >= 0;
                                            const color = isPositive ? '#02c076' : '#f84960';

                                            const formatNumber = (num) => {
                                                if (num === null || num === undefined || num === "" || isNaN(parseFloat(num))) return '---.--';
                                                const parsed = parseFloat(num);
                                                return parsed.toLocaleString('en-US', {
                                                    minimumFractionDigits: parsed < 1 ? 4 : 2,
                                                    maximumFractionDigits: parsed < 1 ? 6 : 2
                                                });
                                            };

                                            return (
                                                <div key={sym || index}
                                                     onClick={() => setExpandedCoin({ sym: upperSym, pureSym, cleanLogoSym, currentPrice, change, high, low, volume, baseVolume, priceChangeAmt, vwap, color })}
                                                     style={{
                                                         background: 'linear-gradient(145deg, #1e2329 0%, #161a1e 100%)', // Rəng açıldı
                                                         borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.04)',
                                                         position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease', cursor: 'pointer',
                                                         display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px'
                                                     }}
                                                     onMouseOver={(e) => {
                                                         e.currentTarget.style.transform = 'translateY(-4px)';
                                                         e.currentTarget.style.border = `1px solid ${color}55`;
                                                         e.currentTarget.style.boxShadow = `0 10px 25px ${color}15`;
                                                     }}
                                                     onMouseOut={(e) => {
                                                         e.currentTarget.style.transform = 'translateY(0)';
                                                         e.currentTarget.style.border = '1px solid rgba(255,255,255,0.04)';
                                                         e.currentTarget.style.boxShadow = 'none';
                                                     }}>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '32px', height: '32px', background: '#2b3139', borderRadius: '50%',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                                                                position: 'relative'
                                                            }}>
                                                                <img
                                                                    src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanLogoSym}.png`}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                                    }}
                                                                    alt={upperSym}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
                                                                />
                                                                <div style={{
                                                                    display: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                                    alignItems: 'center', justifyContent: 'center', background: '#2b3139', zIndex: 1
                                                                }}>
                                <span style={{ color: '#fff', fontWeight: '800', fontSize: '10px' }}>
                                    {upperSym.slice(0, 2)}
                                </span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px', lineHeight: '1.2' }}>{upperSym}</div>
                                                                <div style={{ color: '#848e9c', fontSize: '10px', fontWeight: '600' }}>Crypto Asset</div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '5px', zIndex: 2 }}>
                                                            {inPortfolio && <div title="Vault" style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 'bold', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.2)' }}>💼</div>}
                                                            {coinAlerts.length > 0 && <div title="Alert active" style={{ color: '#fcd535', fontSize: '11px', fontWeight: 'bold', background: 'rgba(252,213,53,0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(252,213,53,0.2)' }}>🔔</div>}
                                                        </div>
                                                    </div>

                                                    {/* QİYMƏT SƏTİRİ */}
                                                    <div style={{ zIndex: 2, position: 'relative', marginTop: '5px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                            <span style={{ color: '#848e9c', fontSize: '10px', fontWeight: '600', letterSpacing: '0.5px' }}>MARKET PRICE</span>
                                                            {currentPrice && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'pulse 2s infinite' }} />}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                            <div style={{ color: '#fff', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                                                                ${formatNumber(currentPrice)}
                                                            </div>
                                                            <div style={{ color: color, fontSize: '12px', fontWeight: '700' }}>
                                                                {isPositive ? '▲' : '▼'} {change ? Math.abs(change).toFixed(2) : '0.00'}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* --- GERİ QAYTARILMIŞ 24H HIGH / LOW --- */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', zIndex: 2, position: 'relative', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                                        <div>
                                                            <div style={{ color: '#64748b', fontSize: '9px', fontWeight: '700' }}>24H HIGH</div>
                                                            <div style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600' }}>${formatNumber(high)}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#64748b', fontSize: '9px', fontWeight: '700' }}>24H LOW</div>
                                                            <div style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600' }}>${formatNumber(low)}</div>
                                                        </div>
                                                    </div>

                                                    <svg viewBox="0 0 100 30" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50px', opacity: 0.2, zIndex: 1 }} preserveAspectRatio="none">
                                                        <path d={isPositive ? "M0,25 Q25,15 50,20 T100,5" : "M0,5 Q25,15 50,10 T100,25"} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ========================================================= */}
                        {/* GENİŞLƏNƏN KART (TERMINAL EKRANI) - CANLI DATA DÜZƏLİŞİ */}
                        {/* ========================================================= */}
                        {expandedCoin && (() => {
                            // DÜZƏLİŞ: Donmuş snapshot yerinə, əsas `prices` state-indən canlı datanı çəkirik
                            const liveData = prices[expandedCoin.sym] || prices[expandedCoin.pureSym] || {};

                            const c = parseFloat(liveData.price || expandedCoin.currentPrice);
                            const h = parseFloat(liveData.high || expandedCoin.high);
                            const l = parseFloat(liveData.low || expandedCoin.low);
                            const vwap = parseFloat(liveData.vwap || expandedCoin.vwap);
                            const priceChangeAmt = liveData.priceChangeAmt || expandedCoin.priceChangeAmt;
                            const change = liveData.change || expandedCoin.change;
                            const baseVolume = liveData.baseVolume || expandedCoin.baseVolume;
                            const volume = liveData.volume || expandedCoin.volume;

                            // Alıcı/Satıcı təzyiqini hesablamaq üçün məntiq
                            const pressure = (h && l && h !== l) ? Math.min(Math.max(((c - l) / (h - l)) * 100, 0), 100) : 50;
                            const isAboveVwap = vwap ? (c >= vwap) : true;

                            return (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                                    background: 'rgba(8, 11, 14, 0.9)', backdropFilter: 'blur(10px)', zIndex: 6000,
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                                }} onClick={() => setExpandedCoin(null)}>

                                    <div onClick={(e) => e.stopPropagation()} style={{
                                        width: '100%', maxWidth: '580px', background: '#0b0e11',
                                        borderRadius: '16px', border: `1px solid ${expandedCoin.color}44`,
                                        boxShadow: `0 30px 60px -15px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)`,
                                        padding: '28px', animation: 'flipInExpand 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        display: 'flex', flexDirection: 'column', gap: '22px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: '#2b3139' }}>
                                                    <img src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${expandedCoin.cleanLogoSym}.png`}
                                                         onError={(e) => { e.target.style.display = 'none'; }}
                                                         alt={expandedCoin.sym} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                        <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>{expandedCoin.sym}</h2>
                                                        <span style={{ color: expandedCoin.color, fontSize: '13px', fontWeight: '700' }}>
       {change && !isNaN(parseFloat(change))
        ? `${parseFloat(change) >= 0 ? '+' : ''}${parseFloat(change).toFixed(2)}%`
        : '0.00%'}
</span>
                                                    </div>
                                                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset Deep-Dive Terminal</span>
                                                </div>
                                            </div>
                                            <button onClick={() => setExpandedCoin(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#848e9c', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e)=>e.target.style.color='#fff'}>✕</button>
                                        </div>

                                        {/* ADVANCED TRADER METRICS */}
                                        <div style={{ background: '#12161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', padding: '20px' }}>

                                            {/* Intraday Pressure Bar */}
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Intraday Buy Pressure</span>
                                                    <span style={{ color: pressure >= 50 ? '#02c076' : '#f84960', fontSize: '11px', fontWeight: '800' }}>{pressure.toFixed(1)}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative' }}>
                                                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pressure}%`, background: `linear-gradient(90deg, #f84960 0%, #02c076 100%)`, borderRadius: '3px', opacity: 0.8 }}></div>
                                                    <div style={{ position: 'absolute', left: `calc(${pressure}% - 2px)`, top: '-2px', width: '4px', height: '10px', background: '#fff', borderRadius: '2px', boxShadow: '0 0 5px rgba(255,255,255,0.5)' }}></div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                                    <span style={{ color: '#475569', fontSize: '9px' }}>Bearish</span>
                                                    <span style={{ color: '#475569', fontSize: '9px' }}>Bullish</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>

                                                {/* VWAP Trend */}
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>VWAP (Trend Baseline)</div>
                                                    <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        ${vwap ? vwap.toLocaleString('en-US', {maximumFractionDigits: 4}) : '---'}
                                                        <span style={{ fontSize: '9px', padding: '2px 4px', borderRadius: '4px', background: isAboveVwap ? 'rgba(2,192,118,0.1)' : 'rgba(248,73,96,0.1)', color: isAboveVwap ? '#02c076' : '#f84960' }}>
                                                            {isAboveVwap ? 'ABOVE' : 'BELOW'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Net Change */}
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Net Change ($)</div>
                                                    <div style={{ color: priceChangeAmt && parseFloat(priceChangeAmt) >= 0 ? '#02c076' : '#f84960', fontSize: '13px', fontWeight: '700' }}>
                                                        {priceChangeAmt ? (parseFloat(priceChangeAmt) > 0 ? '+' : '') + parseFloat(priceChangeAmt).toLocaleString() : '---'}
                                                    </div>
                                                </div>

                                                {/* Base Volume (Token Amount) */}
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Base Vol ({expandedCoin.pureSym})</div>
                                                    <div style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>
                                                        {baseVolume ? parseFloat(baseVolume).toLocaleString('en-US', {maximumFractionDigits: 0}) : '---'}
                                                    </div>
                                                </div>

                                                {/* Quote Volume (USDT Amount) */}
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Turnover (USDT)</div>
                                                    <div style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>
                                                        {volume ? '$' + (parseFloat(volume) / 1e6).toFixed(2) + 'M' : '---'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const symForAnalysis = expandedCoin.pureSym;
                                                setSearchTerm(symForAnalysis);
                                                setExpandedCoin(null);
                                                setTimeout(() => handleProAnalysis(symForAnalysis), 50);
                                            }}
                                            style={{
                                                width: '100%', padding: '16px', background: 'transparent',
                                                color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                transition: 'all 0.2s ease', letterSpacing: '1px', textTransform: 'uppercase'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                                e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.2)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            EXECUTE DEEP ANALYSIS
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* MODALLAR */}
            {isSearchOpen && (<div style={ST.refinedOverlayStyle}>
                <div className="fade-in" style={ST.refinedBoxStyle}>
                    <h3 style={ST.refinedTitleStyle}>CRYPTO INTELLIGENCE</h3>
                    <input autoFocus className="premium-input" placeholder="BTC, ETH, SOL..."
                           value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleProAnalysis()} style={ST.refinedInputStyle}/>
                    <div style={{display: 'flex', gap: '12px', marginTop: '25px'}}>
                        <button onClick={() => handleProAnalysis()} style={ST.proConfirmBtn}>START ANALYSIS</button>
                        <button onClick={() => setIsSearchOpen(false)} style={ST.proCancelBtn}>CANCEL</button>
                    </div>
                </div>
            </div>)}

            <AnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} chartImage={chartBase64}
                           symbol={symbol}/>
            <FearGreedIndex isOpen={isSentimentOpen} onClose={() => setIsSentimentOpen(false)}/>
            <LiquidityMapModal isOpen={isLiquidityOpen} onClose={() => setIsLiquidityOpen(false)} />
            <WhaleRadarModal isOpen={isWhaleRadarOpen} onClose={() => setIsWhaleRadarOpen(false)} />
            {/* --- LUCENT SILVER: HIGH-GLOW VAULT --- */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: isPortfolioOpen ? 0 : '-420px',
                width: '400px',
                height: '100vh',
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(40px) saturate(180%)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.3), inset 10px 0 20px rgba(255,255,255,0.05)',
                transition: 'right 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '45px 35px 25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{
                            color: '#fff',
                            margin: 0,
                            fontSize: '28px',
                            fontWeight: '900',
                            letterSpacing: '-0.5px',
                            textShadow: '0 0 15px rgba(255,255,255,0.3)'
                        }}>Vault</h2>
                        <div style={{
                            width: '30px',
                            height: '3px',
                            background: '#3b82f6',
                            marginTop: '8px',
                            borderRadius: '2px',
                            boxShadow: '0 0 10px #3b82f6'
                        }}></div>
                    </div>
                    <button onClick={() => setIsPortfolioOpen(false)} style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#fff',
                        width: '35px',
                        height: '35px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: '0.3s'
                    }} onMouseOver={(e) => e.target.style.transform = 'rotate(90deg)'}>✕
                    </button>
                </div>

                <div style={{padding: '0 35px 35px'}}>
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '5px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                        <input className="premium-input" placeholder="Type ticker..." style={{
                            marginBottom: 0,
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '500',
                            paddingLeft: '15px',
                            outline: 'none'
                        }} value={portfolioInput} onChange={(e) => setPortfolioInput(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}/>
                        <button onClick={addToWatchlist} style={{
                            background: '#fff',
                            color: '#000',
                            border: 'none',
                            padding: '12px 22px',
                            borderRadius: '10px',
                            fontWeight: '900',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: '0.2s',
                            boxShadow: '0 0 15px rgba(255,255,255,0.4)'
                        }}>ADD
                        </button>
                    </div>
                </div>

                <div style={{flex: 1, overflowY: 'auto', padding: '0 25px 30px'}} className="custom-scrollbar">
                    {watchlist.length === 0 ? (
                        <div style={{
                            color: 'rgba(255,255,255,0.3)',
                            textAlign: 'center',
                            marginTop: '60px',
                            fontSize: '12px',
                            letterSpacing: '1px'
                        }}>EMPTY_RESERVE</div>
                    ) : (
                        watchlist.map((item, index) => (
                            <div key={item.id || index} style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                padding: '20px 25px',
                                marginBottom: '12px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.3s ease' /* Animasiya və opacity:0 silindi */
                            }}
                                 onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                 onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <div style={{
                            color: '#fff',
                            fontWeight: '800',
                            fontSize: '16px',
                            letterSpacing: '0.5px',
                            textShadow: '0 0 10px rgba(255,255,255,0.2)'
                        }}>{item.symbol}</div>
                        <button onClick={() => removeFromWatchlist(item.symbol)} style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: '0.2s',
                            padding: '5px'
                        }} onMouseOver={(e) => {
                            e.target.style.color = '#f84960';
                            e.target.style.textShadow = '0 0 10px #f84960';
                        }} onMouseOut={(e) => {
                            e.target.style.color = 'rgba(255,255,255,0.2)';
                            e.target.style.textShadow = 'none';
                        }}>✕
                        </button>
                    </div>)))}
                </div>

                <div style={{
                    padding: '25px 35px',
                    background: 'rgba(255,255,255,0.03)',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.4)',
                            fontWeight: '700',
                            letterSpacing: '1px'
                        }}>TOTAL_ASSETS</span>
                        <span style={{
                            fontWeight: '900',
                            color: '#fff',
                            fontSize: '18px',
                            textShadow: '0 0 10px rgba(255,255,255,0.3)'
                        }}>{watchlist.length}</span>
                    </div>
                </div>
            </div>

            {isPortfolioOpen && (<div onClick={() => setIsPortfolioOpen(false)} style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.3)',
                zIndex: 1999,
                backdropFilter: 'blur(2px)'
            }}/>)}

            {/* --- HIGH-LEVEL ALERT MANAGEMENT --- */}
            {/* --- HIGH-LEVEL ALERT MANAGEMENT --- */}
            {isTelegramModalOpen && (<div style={ST.modalOverlayStyle}>
                <div className="fade-in" style={{
                    width: '420px',
                    padding: '30px',
                    position: 'relative',
                    background: 'rgba(11, 14, 17, 0.98)',
                    borderRadius: '18px',
                    border: '1px solid rgba(34,197,94,0.3)'
                }}>
                    <button onClick={() => setIsTelegramModalOpen(false)} style={{ ...ST.closeBtnStyle }}>✕</button>
                    <h2 style={{ color: '#fff', marginTop: 0 }}>Telegram Connect</h2>

                    {telegramStatus.connected ? (
                        // --- QOŞULDUQDA GÖRÜNƏCƏK EKRAN ---
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px', animation: 'pulse 2s infinite' }}>✅</div>
                            <h3 style={{ color: '#22c55e', margin: '0 0 10px 0', fontSize: '20px' }}>Succes Connect!</h3>
                            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '25px' }}>
                                Aktiv Chat ID: <strong style={{color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px'}}>{telegramStatus.chatId}</strong>
                            </p>

                            <button onClick={handleTelegramDisconnect} style={{
                                width: '100%',
                                background: 'rgba(248, 73, 96, 0.1)',
                                color: '#f84960',
                                border: '1px solid rgba(248, 73, 96, 0.3)',
                                padding: '12px',
                                borderRadius: '10px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                                    onMouseOver={(e) => {
                                        e.target.style.background = 'rgba(248, 73, 96, 0.2)';
                                        e.target.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.background = 'rgba(248, 73, 96, 0.1)';
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                            >
                                Bağlantını Kəs
                            </button>
                        </div>
                    ) : (
                        // --- QOŞULMADIQDA GÖRÜNƏCƏK EKRAN ---
                        <>
                            <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                                No need to enter a Chat ID. Click "Open Bot", Start in Telegram, then "Check Connection".
                            </p>

                            <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>⚠️ Status:</span> <strong>Bağlı deyil</strong>
                            </div>

                            <button onClick={initTelegramConnection} style={{
                                width: '100%',
                                background: '#38bdf8',
                                color: '#032033',
                                border: 'none',
                                padding: '12px',
                                borderRadius: '10px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                marginBottom: '10px',
                                transition: '0.2s'
                            }}
                                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                Turn Bot
                            </button>

                            <button onClick={confirmTelegramConnection} style={{
                                width: '100%',
                                background: '#22c55e',
                                color: '#051b0f',
                                border: 'none',
                                padding: '12px',
                                borderRadius: '10px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                Check Connection
                            </button>
                        </>
                    )}
                </div>
            </div>)}

            {isAlertModalOpen && (<div style={ST.modalOverlayStyle}>
                <div className="fade-in" style={{
                    width: '450px',
                    padding: '35px',
                    position: 'relative',
                    background: 'rgba(11, 14, 17, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 204, 0, 0.25)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                }}>
                    <button onClick={() => setIsAlertModalOpen(false)} style={{
                        ...ST.closeBtnStyle,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>✕
                    </button>
                    <div style={{marginBottom: '25px'}}>
                        <h2 style={{color: 'white', margin: 0, fontSize: '20px', fontWeight: '800'}}>Active Signals</h2>
                        <p style={{
                            color: '#848e9c',
                            fontSize: '11px',
                            marginTop: '4px',
                            letterSpacing: '1px'
                        }}>SYSTEM_MONITORING_ACTIVE</p>
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '30px',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '15px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <input className="premium-input" placeholder="BTC"
                               style={{marginBottom: 0, flex: 1, fontSize: '13px'}} value={alertInput.symbol}
                               onChange={(e) => setAlertInput({...alertInput, symbol: e.target.value})}/>
                        <input className="premium-input" placeholder="Price" type="number"
                               style={{marginBottom: 0, flex: 1, fontSize: '13px'}} value={alertInput.targetPrice}
                               onChange={(e) => setAlertInput({...alertInput, targetPrice: e.target.value})}/>
                        <button onClick={addAlert} style={{
                            background: '#f0b90b',
                            color: '#000',
                            border: 'none',
                            padding: '0 20px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}>SET
                        </button>
                    </div>
                    <div style={{maxHeight: '280px', overflowY: 'auto'}} className="custom-scrollbar">
                        {alerts.map((item, index) => (
                            <div key={item.id || item.alertId || item._id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '14px',
                                marginBottom: '10px',
                                border: '1px solid rgba(255,255,255,0.05)'
                                /* opacity: 0 və animation sətirləri BURADAN DA SİLİNDİ */
                            }}>
                            <div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <span style={{
                                        color: 'white',
                                        fontWeight: '800',
                                        fontSize: '14px'
                                    }}>{item.symbol}</span>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#02c076',
                                        boxShadow: '0 0 8px #02c076'
                                    }}></div>
                                </div>
                                <div style={{color: '#848e9c', fontSize: '12px', marginTop: '4px'}}>
                                    Target: <span style={{color: '#f0b90b'}}>${item.targetPrice}</span>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteClick(item)} style={{
                                background: 'rgba(248, 73, 96, 0.1)',
                                border: 'none',
                                color: '#f84960',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: '700'
                            }}>TERMINATE
                            </button>
                        </div>))}
                    </div>
                </div>
            </div>)}

            {/* --- DELETE CONFIRMATION OVERLAY --- */}
            {deleteTarget && (<div style={{...ST.modalOverlayStyle, zIndex: 10000}}>
                <div className="fade-in" style={{
                    width: '320px',
                    padding: '30px',
                    background: '#161a1e',
                    borderRadius: '24px',
                    textAlign: 'center',
                    border: '1px solid rgba(248, 73, 96, 0.3)'
                }}>
                    <div style={{fontSize: '32px', marginBottom: '15px'}}>🚨</div>
                    <h3 style={{color: 'white', margin: '0 0 8px'}}>Confirm Termination</h3>
                    <p style={{color: '#848e9c', fontSize: '12px', lineHeight: '1.6'}}>
                        Are you sure you want to stop monitoring <b style={{color: '#fff'}}>{deleteTarget.symbol}</b>?
                    </p>
                    <div style={{display: 'flex', gap: '10px', marginTop: '25px'}}>
                        <button onClick={() => setDeleteTarget(null)} style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}>Cancel
                        </button>
                        <button onClick={confirmDelete} style={{
                            flex: 1,
                            background: '#f84960',
                            color: 'white',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '700'
                        }}>Confirm
                        </button>
                    </div>
                </div>
            </div>)}
        </div>)}


        {/* 3. OTP VIEW */}
        {view === 'otp' && (
            <AuthForm
                view={view}
                setView={setView}
                handleSignup={handleSignup}
                handleVerify={handleVerifyOtp} // Mütləq ötürülməlidir (Bayaq yaratdıq)
                handleLogin={handleLogin}
                handleChange={handleChange} // YENİLƏNDİ: Artıq xüsusi setOtp yerinə normal handleChange ötürürük
                formData={{
                    ...formData,
                    // Əgər formData.email boşdursa, localdan oxuyub ehtiyat edirik
                    email: formData?.email || localStorage.getItem('userEmail')
                }}
                message={message}
                setMessage={setMessage}
                authLoading={authLoading}
            />
        )}{/* --- YENİ UX MODAL: PAPER TRADING TEST XƏBƏRDARLIĞI --- */}
        {isTestWarningOpen && (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}>
                <div className="fade-in" style={{
                    background: '#161a1e', width: '450px', borderRadius: '24px',
                    border: '1px solid rgba(252, 213, 53, 0.3)', padding: '35px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 40px rgba(252, 213, 53, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '36px' }}>🧪</div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800' }}>System is in Testing Phase</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#fcd535', fontSize: '12px', fontWeight: '700', letterSpacing: '1px' }}>PAPER TRADING MODULE</p>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ color: '#848e9c', fontSize: '16px' }}>📌</span>
                            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}><b>No real payment</b> is required to participate in this section.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ color: '#848e9c', fontSize: '16px' }}>🏆</span>
                            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>The competition is for ranking purposes only and <b>no real rewards are given.</b></p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ color: '#848e9c', fontSize: '16px' }}>⚙️</span>
                            <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>All transactions are carried out solely for the purpose of system verification (Paper Trading).</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setIsTestWarningOpen(false)} style={{
                            flex: 1, padding: '14px', background: 'transparent', color: '#fff',
                            border: '1px solid #444', borderRadius: '12px', fontWeight: '600', cursor: 'pointer'
                        }}>Go Back</button>
                        <button onClick={() => { setIsTestWarningOpen(false); navigate('/trade-ms'); }} style={{
                            flex: 1, padding: '14px', background: '#fcd535', color: '#000',
                            border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(252, 213, 53, 0.3)'
                        }}>Got it, Continue</button>
                    </div>
                </div>
            </div>
        )}

        {systemMessage && (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)',
                zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, #161a1e 0%, #0b0e11 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '20px',
                    padding: '40px', maxWidth: '500px', width: '90%', textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 20px rgba(59, 130, 246, 0.2)',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <div style={{ fontSize: '50px', marginBottom: '15px', animation: 'pulse 2s infinite' }}>📢</div>
                    <h2 style={{ color: '#3b82f6', margin: '0 0 15px 0', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        System Notification
                    </h2>
                    <div style={{ width: '50px', height: '3px', background: '#3b82f6', margin: '0 auto 20px auto', borderRadius: '3px' }}></div>

                    <p style={{ color: '#e2e8f0', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px', fontWeight: '500' }}>
                        {systemMessage}
                    </p>

                    <button onClick={closeSystemMessage} style={{
                        background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#fff', border: 'none', padding: '14px 40px', borderRadius: '12px',
                        fontSize: '14px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s ease',
                        letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)'
                    }} onMouseOver={(e)=>e.target.style.transform='translateY(-2px)'} onMouseOut={(e)=>e.target.style.transform='translateY(0)'}>
                        Got it, Thanks
                    </button>
                </div>
                <style>
                    {`
                    @keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
                `}
                </style>
            </div>
        )}
    </div>);

}

export default User;
