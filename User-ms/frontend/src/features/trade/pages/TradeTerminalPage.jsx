import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketApi, tradeApi } from '../../../api';
import toast from "react-hot-toast";

const TOAST_ERROR_STYLE = {
    icon: '📢',
    duration: 6000,
    style: {
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        color: '#fff',
        fontWeight: '700',
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)'
    }
};

const safeParseNumber = (val) => {
    if (val === null || val === undefined || val === "") return null;
    let str = val.toString().trim().replace(/,/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
};

const TradeTerminal = () => {
    const container = useRef();
    const navigate = useNavigate();

    const [balance, setBalance] = useState(() => {
        return Number(localStorage.getItem(`userBalance_${localStorage.getItem('userEmail') || 'guest'}`)) || 10000;
    });

    const [symbol, setSymbol] = useState("BTCUSDT");
    const [allMarkets, setAllMarkets] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [user, setUser] = useState(null);
    const [amount, setAmount] = useState("");
    const [leverage, setLeverage] = useState(10);
    const [footerHeight, setFooterHeight] = useState(240);
    const [isDragging, setIsDragging] = useState(false);
    const [orderType, setOrderType] = useState('MARKET');
    const [targetPrice, setTargetPrice] = useState('');
    const [tpPrice, setTpPrice] = useState('');
    const [slPrice, setSlPrice] = useState('');
    const [positions, setPositions] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('POSITIONS');
    const [isFullChart, setIsFullChart] = useState(false);
    const [isMarketOpen, setIsMarketOpen] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [editTp, setEditTp] = useState('');
    const [editSl, setEditSl] = useState('');

    const filteredMarkets = useMemo(() => {
        return allMarkets.filter((market) => market.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allMarkets, searchTerm]);

    const startResizing = () => setIsDragging(true);

    const clearAuthStorage = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
    };

    const fetchUserData = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (!token || !refreshToken) {
            setUser(null);
            return;
        }

        try {
            const res = await tradeApi.getCurrentUser();
            const currentUser = res.data;

            if (currentUser) {
                const currentVirtualBalance =
                    currentUser.virtualBalance != null ? Number(currentUser.virtualBalance) : 10000;

                setBalance(currentVirtualBalance);
                setUser(currentUser);
                localStorage.setItem(`userBalance_${currentUser.email}`, currentVirtualBalance.toString());
            }
        } catch (err) {
            console.error("Balance update error:", err);

            if (err.response?.status === 401) {
                console.warn("401 received in fetchUserData - interceptor should handle refresh.");
                return;
            }

            if (err.response?.status === 403) {
                clearAuthStorage();
                toast.error("Your access has been restricted. Please log in again.");
                navigate('/');
            }
        }
    }, [navigate]);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (!token || !refreshToken) {
            setPositions([]);
            setPendingOrders([]);
            setUser(null);
            return;
        }

        try {
            const [posRes, pendRes] = await Promise.all([
                tradeApi.getActiveTrades().catch(() => ({data: []})),
                tradeApi.getPendingTrades().catch(() => ({data: []}))
            ]);

            setPositions(posRes.data || []);
            setPendingOrders(pendRes.data || []);
        } catch (err) {
            console.error("Trade fetch error:", err);

            if (err.response?.status === 401) {
                console.warn("401 received in fetchData - interceptor should handle refresh.");
                return;
            }

            toast.error("Failed to load trades.");
        }
    }, []);

    const handleOpenTrade = async (side) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return toast.error("You are not logged in!");

        const marginVal = safeParseNumber(amount);
        const targetPriceVal = safeParseNumber(targetPrice);
        const tpPriceVal = safeParseNumber(tpPrice);
        const slPriceVal = safeParseNumber(slPrice);

        if (!marginVal || marginVal < 10) {
            return toast('Minimum margin must be 10 USDT.', {icon: '⚠️'});
        }

        if (orderType === 'LIMIT' && (!targetPriceVal || targetPriceVal <= 0)) {
            return toast('Please enter a target price for limit order.', {icon: '⚠️'});
        }

        if (balance < marginVal) {
            return toast.error('Insufficient balance!');
        }

        const activeUserId = user?.id;
        if (!activeUserId) {
            return toast.error("User data is not loaded yet. Please try again.");
        }

        setLoading(true);
        try {
            const payload = {
                userId: activeUserId,
                symbol: symbol,
                side: side,
                margin: marginVal,
                leverage: leverage,
                takeProfit: tpPriceVal,
                stopLoss: slPriceVal,
                targetPrice: orderType === 'LIMIT' ? targetPriceVal : null,
            };

            await tradeApi.openTrade(payload);

            setAmount('');
            setTargetPrice('');
            setTpPrice('');
            setSlPrice('');
            toast.success("Order executed successfully!");

            await Promise.all([fetchUserData(), fetchData()]);
            setActiveTab(orderType === 'LIMIT' ? 'PENDING' : 'POSITIONS');
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data ||
                'An error occurred while opening trade.';
            toast(errorMsg, TOAST_ERROR_STYLE);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseTrade = async (tradeId) => {
        try {
            await tradeApi.closeTrade(tradeId);
            toast.success("Position closed successfully!");
            await Promise.all([fetchUserData(), fetchData()]);
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data ||
                'Could not close the position.';
            toast(errorMsg, TOAST_ERROR_STYLE);
        }
    };

    const handleCancelOrder = async (tradeId) => {
        try {
            await tradeApi.cancelTrade(tradeId);
            toast.success("Order canceled.");
            await Promise.all([fetchUserData(), fetchData()]);
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data ||
                'Could not cancel the order.';
            toast(errorMsg, TOAST_ERROR_STYLE);
        }
    };

    const openEditTPSL = (trade) => {
        setSelectedPosition(trade);
        setEditTp(trade.takeProfit || '');
        setEditSl(trade.stopLoss || '');
        setIsEditModalOpen(true);
    };

    const handleUpdateTPSL = async () => {
        if (!selectedPosition?.id) return toast.error("Position ID not found.");

        const finalTp = safeParseNumber(editTp);
        const finalSl = safeParseNumber(editSl);

        setLoading(true);
        try {
            const payload = {takeProfit: finalTp, stopLoss: finalSl};
            const response = await tradeApi.updateTpSl(selectedPosition.id, payload);

            if (response.status === 200 || response.status === 204) {
                setIsEditModalOpen(false);
                toast.success("Target prices updated.");
                await fetchData();
            }
        } catch (err) {
            const serverMessage =
                err.response?.data?.message ||
                err.response?.data ||
                "Connection lost with backend.";
            toast(serverMessage, TOAST_ERROR_STYLE);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
        fetchData();

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchUserData();
                fetchData();
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchUserData, fetchData]);

    useEffect(() => {
        let isMounted = true;

        const fetchMarkets = async () => {
            try {
                const response = await marketApi.getExchangeInfo();
                if (!isMounted) return;

                const markets = (response.data?.symbols || [])
                    .filter((item) => item.quoteAsset === 'USDT' && item.status === 'TRADING')
                    .map((item) => item.symbol);

                setAllMarkets(markets);
            } catch (err) {
                console.error('Market list error', err);
                if (isMounted) {
                    setAllMarkets(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']);
                }
            }
        };

        fetchMarkets();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!isDragging) return undefined;

        const onMove = (e) => {
            const nextHeight = window.innerHeight - e.clientY - 20;
            const clampedHeight = Math.max(160, Math.min(520, nextHeight));
            setFooterHeight(clampedHeight);
        };

        const onUp = () => setIsDragging(false);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging]);

    useEffect(() => {
        const chartContainer = container.current;
        if (!chartContainer) return;

        chartContainer.innerHTML = '';

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: `BINANCE:${symbol}`,
            interval: "15",
            theme: "dark",
            style: "1",
            locale: "en",
            allow_symbol_change: false,
            container_id: "tradingview_chart"
        });

        chartContainer.appendChild(script);

        return () => {
            if (chartContainer) {
                chartContainer.innerHTML = '';
            }
        };
    }, [symbol]);

    const renderEditModal = () => {
        if (!isEditModalOpen || !selectedPosition) return null;

        const entry = safeParseNumber(selectedPosition.entryPrice);
        const mrg = safeParseNumber(selectedPosition.margin);
        const lev = safeParseNumber(selectedPosition.leverage);
        const side = selectedPosition.side;

        const getPnlPreview = (targetVal) => {
            const exit = safeParseNumber(targetVal);
            if (!exit || !entry || !mrg || !lev) {
                return {amount: "0.00", percent: "0.00", isProfit: true};
            }

            const pnl = (side === 'SHORT' ? (entry - exit) : (exit - entry)) / entry * mrg * lev;
            const percent = (pnl / mrg) * 100;

            return {
                amount: pnl.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }),
                percent: percent.toFixed(2),
                isProfit: pnl >= 0
            };
        };

        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(8px)'
                }}
            >
                <div
                    style={{
                        background: '#161616',
                        width: '360px',
                        borderRadius: '16px',
                        border: '1px solid #222',
                        padding: '24px',
                        boxShadow: '0 25px 50px rgba(0,0,0,1)'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}
                    >
                        <h3 style={{color: '#fff', margin: 0, fontSize: '18px', fontWeight: '900'}}>
                            EDIT TP/SL
                        </h3>
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#444',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div
                        style={{
                            background: '#0a0a0a',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #111'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '5px'
                            }}
                        >
                            <span style={{color: '#444', fontSize: '11px', fontWeight: 'bold'}}>
                                ENTRY PRICE
                            </span>
                            <span style={{color: '#fff', fontSize: '11px', fontWeight: 'bold'}}>
                                {entry ? `${entry.toLocaleString()} USDT` : '--'}
                            </span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <span style={{color: '#444', fontSize: '11px', fontWeight: 'bold'}}>
                                SIDE
                            </span>
                            <span
                                style={{
                                    color: side === 'LONG' ? '#00ffa3' : '#ff4d4d',
                                    fontSize: '11px',
                                    fontWeight: '900'
                                }}
                            >
                                {side}
                            </span>
                        </div>
                    </div>

                    <div style={{marginBottom: '15px'}}>
                        <label
                            style={{
                                color: '#00ffa3',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                display: 'block',
                                marginBottom: '8px'
                            }}
                        >
                            TAKE PROFIT (TP)
                        </label>
                        <input
                            type="text"
                            value={editTp}
                            onChange={(e) => setEditTp(e.target.value.replace(/,/g, '.'))}
                            placeholder="Price"
                            style={{
                                width: '100%',
                                background: '#080808',
                                border: '1px solid #222',
                                padding: '14px',
                                borderRadius: '10px',
                                color: '#fff',
                                outline: 'none',
                                fontWeight: 'bold'
                            }}
                        />
                        {editTp && (
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: getPnlPreview(editTp).isProfit ? '#00ffa3' : '#ff4d4d',
                                    marginTop: '6px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {getPnlPreview(editTp).isProfit ? 'Est. Profit: +' : 'Est. Loss: '}
                                {getPnlPreview(editTp).amount} USDT ({getPnlPreview(editTp).percent}%)
                            </div>
                        )}
                    </div>

                    <div style={{marginBottom: '25px'}}>
                        <label
                            style={{
                                color: '#ff4d4d',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                display: 'block',
                                marginBottom: '8px'
                            }}
                        >
                            STOP LOSS (SL)
                        </label>
                        <input
                            type="text"
                            value={editSl}
                            onChange={(e) => setEditSl(e.target.value.replace(/,/g, '.'))}
                            placeholder="Price"
                            style={{
                                width: '100%',
                                background: '#080808',
                                border: '1px solid #222',
                                padding: '14px',
                                borderRadius: '10px',
                                color: '#fff',
                                outline: 'none',
                                fontWeight: 'bold'
                            }}
                        />
                        {editSl && (
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: getPnlPreview(editSl).isProfit ? '#00ffa3' : '#ff4d4d',
                                    marginTop: '6px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {getPnlPreview(editSl).isProfit ? 'Est. Profit: +' : 'Est. Loss: '}
                                {getPnlPreview(editSl).amount} USDT ({getPnlPreview(editSl).percent}%)
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleUpdateTPSL}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: '#FFD700',
                            color: '#000',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '900',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            transition: '0.2s'
                        }}
                    >
                        {loading ? "SAVING..." : "CONFIRM"}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                backgroundColor: '#080808',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'Inter, sans-serif',
                userSelect: isDragging ? 'none' : 'auto'
            }}
        >
            {isDragging && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                        cursor: 'row-resize'
                    }}
                />
            )}

            <header
                style={{
                    height: '60px',
                    borderBottom: '1px solid rgba(255, 215, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    justifyContent: 'space-between',
                    background: '#080808',
                    zIndex: 1000
                }}
            >
                <div style={{display: 'flex', alignItems: 'center', gap: '25px'}}>
                    <div style={{fontWeight: '900', color: '#fff', fontSize: '18px', letterSpacing: '1px'}}>
                        MONEY <span style={{color: '#FFD700'}}>STRATEGY</span>
                    </div>

                    <button
                        onClick={() => setIsFullChart(!isFullChart)}
                        style={{
                            background: isFullChart ? '#FFD700' : '#1a1a1a',
                            border: '1px solid #333',
                            color: isFullChart ? '#000' : '#fff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            transition: '0.3s'
                        }}
                    >
                        {isFullChart ? "✕ CLOSE FULL" : "⛶ FULL CHART"}
                    </button>
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: '25px'}}>
                    <div style={{textAlign: 'right', borderRight: '1px solid #222', paddingRight: '20px'}}>
                        <div
                            style={{
                                fontSize: '9px',
                                color: 'rgba(255,255,255,0.4)',
                                fontWeight: '800',
                                letterSpacing: '0.5px',
                                marginBottom: '2px'
                            }}
                        >
                            AVAILABLE BALANCE
                        </div>
                        <div
                            style={{
                                color: '#00ffa3',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                fontFamily: 'JetBrains Mono, monospace'
                            }}
                        >
                            ${Number(balance).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                        </div>
                    </div>

                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        {user?.isPremium && (
                            <div
                                style={{
                                    background: 'rgba(255, 215, 0, 0.1)',
                                    color: '#FFD700',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    border: '1px solid rgba(255, 215, 0, 0.3)'
                                }}
                            >
                                PREMIUM
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #444',
                                color: '#888',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                transition: '0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.borderColor = '#ff4d4d';
                                e.target.style.color = '#ff4d4d';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.borderColor = '#444';
                                e.target.style.color = '#888';
                            }}
                        >
                            EXIT
                        </button>
                    </div>
                </div>
            </header>

            <div style={{display: 'flex', flex: 1, overflow: 'hidden'}}>
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                        position: 'relative'
                    }}
                >
                    <div style={{flex: 1, position: 'relative'}}>
                        <div id="tradingview_chart" ref={container} style={{height: '100%'}}/>
                    </div>

                    {!isFullChart && (
                        <>
                            <div
                                onMouseDown={startResizing}
                                style={{
                                    height: '6px',
                                    background: isDragging ? '#FFD700' : '#1a1a1a',
                                    cursor: 'row-resize',
                                    zIndex: 100
                                }}
                            />

                            <footer
                                style={{
                                    height: `${footerHeight}px`,
                                    background: '#080808',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '25px',
                                        padding: '0 20px',
                                        background: '#0a0a0a',
                                        borderBottom: '1px solid #111'
                                    }}
                                >
                                    <div
                                        onClick={() => setActiveTab('POSITIONS')}
                                        style={{
                                            fontSize: '11px',
                                            color: activeTab === 'POSITIONS' ? '#FFD700' : '#444',
                                            padding: '14px 0',
                                            borderBottom: activeTab === 'POSITIONS' ? '2px solid #FFD700' : 'none',
                                            fontWeight: '800',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        POSITIONS ({positions.length})
                                    </div>

                                    <div
                                        onClick={() => setActiveTab('PENDING')}
                                        style={{
                                            fontSize: '11px',
                                            color: activeTab === 'PENDING' ? '#FFD700' : '#444',
                                            padding: '14px 0',
                                            borderBottom: activeTab === 'PENDING' ? '2px solid #FFD700' : 'none',
                                            fontWeight: '800',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        OPEN ORDERS ({pendingOrders.length})
                                    </div>
                                </div>

                                <div style={{flex: 1, overflowY: 'auto', padding: '0 20px'}}>
                                    <table
                                        style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            marginTop: '10px'
                                        }}
                                    >
                                        <thead>
                                        <tr style={{borderBottom: '1px solid #111', textAlign: 'left'}}>
                                            <th style={{
                                                color: '#444',
                                                fontSize: '9px',
                                                padding: '10px 0',
                                                fontWeight: 'bold'
                                            }}>
                                                SYMBOL
                                            </th>
                                            <th style={{
                                                color: '#444',
                                                fontSize: '9px',
                                                padding: '10px 0',
                                                fontWeight: 'bold'
                                            }}>
                                                SIDE
                                            </th>
                                            <th style={{
                                                color: '#444',
                                                fontSize: '9px',
                                                padding: '10px 0',
                                                fontWeight: 'bold'
                                            }}>
                                                ENTRY PRICE
                                            </th>
                                            <th style={{
                                                color: '#444',
                                                fontSize: '9px',
                                                padding: '10px 0',
                                                fontWeight: 'bold'
                                            }}>
                                                MARGIN (LEV.)
                                            </th>
                                            <th style={{
                                                color: '#444',
                                                fontSize: '9px',
                                                padding: '10px 0',
                                                fontWeight: 'bold'
                                            }}>
                                                {activeTab === 'POSITIONS' ? 'TP / SL' : 'TARGET PRICE'}
                                            </th>
                                            <th
                                                style={{
                                                    color: '#444',
                                                    fontSize: '9px',
                                                    padding: '10px 0',
                                                    fontWeight: 'bold',
                                                    textAlign: 'right'
                                                }}
                                            >
                                                {activeTab === 'POSITIONS' ? 'UNREALIZED PNL' : 'ACTION'}
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody style={{fontFamily: 'JetBrains Mono, monospace'}}>
                                        {(activeTab === 'POSITIONS' ? positions : pendingOrders).map((trade) => (
                                            <tr
                                                key={trade.id}
                                                style={{
                                                    borderBottom: '1px solid #0f0f0f',
                                                    verticalAlign: 'middle'
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        padding: '12px 0'
                                                    }}
                                                >
                                                    {trade.symbol}
                                                    <span style={{color: '#444', fontSize: '9px', marginLeft: '4px'}}>
                                                            Isolated
                                                        </span>
                                                </td>

                                                <td
                                                    style={{
                                                        color: trade.side === 'LONG' ? '#00ffa3' : '#ff4d4d',
                                                        fontSize: '10px',
                                                        fontWeight: '900'
                                                    }}
                                                >
                                                    {trade.side}
                                                </td>

                                                <td style={{color: '#ccc', fontSize: '11px'}}>
                                                    {trade.entryPrice
                                                        ? Number(trade.entryPrice).toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })
                                                        : '--'}
                                                </td>

                                                <td style={{color: '#ccc', fontSize: '11px'}}>
                                                    {Number(trade.margin || 0).toLocaleString('en-US', {
                                                        minimumFractionDigits: 2
                                                    })}
                                                    <span style={{color: '#444', marginLeft: '4px'}}>
                                                            ({trade.leverage}x)
                                                        </span>
                                                </td>

                                                <td style={{padding: '8px 0'}}>
                                                    {activeTab === 'POSITIONS' ? (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '2px'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px'
                                                                }}
                                                            >
                                                                    <span
                                                                        style={{
                                                                            color: '#444',
                                                                            fontSize: '9px',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        TP
                                                                    </span>
                                                                <span
                                                                    style={{
                                                                        color: trade.takeProfit ? '#00ffa3' : '#666',
                                                                        fontSize: '10px'
                                                                    }}
                                                                >
                                                                        {trade.takeProfit
                                                                            ? Number(trade.takeProfit).toLocaleString('en-US')
                                                                            : '--'}
                                                                    </span>
                                                            </div>

                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px'
                                                                }}
                                                            >
                                                                    <span
                                                                        style={{
                                                                            color: '#444',
                                                                            fontSize: '9px',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        SL
                                                                    </span>
                                                                <span
                                                                    style={{
                                                                        color: trade.stopLoss ? '#ff4d4d' : '#666',
                                                                        fontSize: '10px'
                                                                    }}
                                                                >
                                                                        {trade.stopLoss
                                                                            ? Number(trade.stopLoss).toLocaleString('en-US')
                                                                            : '--'}
                                                                    </span>

                                                                <button
                                                                    onClick={() => openEditTPSL(trade)}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: '#FFD700',
                                                                        cursor: 'pointer',
                                                                        fontSize: '10px',
                                                                        padding: '0 2px',
                                                                        opacity: 0.6,
                                                                        transition: '0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.opacity = 1;
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.opacity = 0.6;
                                                                    }}
                                                                    title="Edit TP/SL"
                                                                >
                                                                    ✎
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            style={{
                                                                color: trade.targetPrice ? '#FFD700' : '#666',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                                {trade.targetPrice
                                                                    ? `$${Number(trade.targetPrice).toLocaleString('en-US', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2
                                                                    })}`
                                                                    : '--'}
                                                            </span>
                                                    )}
                                                </td>

                                                <td
                                                    style={{
                                                        color:
                                                            activeTab === 'POSITIONS'
                                                                ? parseFloat(trade.pnl || 0) >= 0
                                                                    ? '#00ffa3'
                                                                    : '#ff4d4d'
                                                                : '#888',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        textAlign: 'right'
                                                    }}
                                                >
                                                    {activeTab === 'POSITIONS' ? (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'flex-end'
                                                            }}
                                                        >
                                                                <span>
                                                                    {parseFloat(trade.pnl || 0) > 0 ? '+' : ''}
                                                                    {parseFloat(trade.pnl || 0).toLocaleString('en-US', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2
                                                                    })}{' '}
                                                                    USDT
                                                                </span>
                                                            <span style={{fontSize: '9px', opacity: 0.7}}>
                                                                    ({parseFloat(trade.pnlPercentage || 0).toFixed(2)}%)
                                                                </span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCancelOrder(trade.id)}
                                                            disabled={loading}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #333',
                                                                color: '#888',
                                                                fontSize: '9px',
                                                                padding: '6px 12px',
                                                                borderRadius: '4px',
                                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                                fontWeight: '900',
                                                                transition: '0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!loading) {
                                                                    e.target.style.background = 'rgba(255,255,255,0.05)';
                                                                    e.target.style.borderColor = '#444';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!loading) {
                                                                    e.target.style.background = 'transparent';
                                                                    e.target.style.borderColor = '#333';
                                                                }
                                                            }}
                                                        >
                                                            CANCEL
                                                        </button>
                                                    )}
                                                </td>

                                                {activeTab === 'POSITIONS' && (
                                                    <td style={{textAlign: 'right', paddingLeft: '10px'}}>
                                                        <button
                                                            onClick={() => handleCloseTrade(trade.id)}
                                                            disabled={loading}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #333',
                                                                color: '#ff4d4d',
                                                                fontSize: '9px',
                                                                padding: '6px 12px',
                                                                borderRadius: '4px',
                                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                                fontWeight: '900',
                                                                transition: '0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!loading) {
                                                                    e.target.style.background = 'rgba(255, 77, 77, 0.1)';
                                                                    e.target.style.borderColor = '#ff4d4d';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!loading) {
                                                                    e.target.style.background = 'transparent';
                                                                    e.target.style.borderColor = '#333';
                                                                }
                                                            }}
                                                        >
                                                            CLOSE
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>

                                    {(activeTab === 'POSITIONS' ? positions.length : pendingOrders.length) === 0 && (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                color: '#333',
                                                fontSize: '11px',
                                                marginTop: '40px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            NO ACTIVE {activeTab} FOUND
                                        </div>
                                    )}
                                </div>
                            </footer>
                        </>
                    )}
                </div>

                {!isFullChart && (
                    <aside
                        style={{
                            width: '320px',
                            background: '#0e0e0e',
                            padding: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            height: '100%',
                            borderLeft: '1px solid rgba(255,255,255,0.03)',
                            overflowY: 'auto'
                        }}
                    >
                        <div style={{position: 'relative', zIndex: 100}}>
                            <label
                                style={{
                                    fontSize: '10px',
                                    color: '#444',
                                    fontWeight: 'bold',
                                    display: 'block',
                                    marginBottom: '8px',
                                    letterSpacing: '1px'
                                }}
                            >
                                MARKET
                            </label>

                            <div
                                onClick={() => setIsMarketOpen(!isMarketOpen)}
                                style={{
                                    background: '#161616',
                                    border: '1px solid #222',
                                    padding: '12px 15px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    borderLeft: '3px solid #FFD700'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#222';
                                }}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <span
                                        style={{
                                            color: '#fff',
                                            fontWeight: '900',
                                            fontSize: '15px',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        {symbol}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '10px',
                                            color: '#00ffa3',
                                            background: 'rgba(0, 255, 163, 0.1)',
                                            padding: '2px 4px',
                                            borderRadius: '3px'
                                        }}
                                    >
                                        100x
                                    </span>
                                </div>
                                <span style={{color: '#FFD700', fontSize: '10px', opacity: 0.8}}>
                                    {isMarketOpen ? '▲' : '▼'}
                                </span>
                            </div>

                            {isMarketOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '105%',
                                        left: 0,
                                        right: 0,
                                        background: '#111',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        boxShadow: '0 15px 35px rgba(0,0,0,0.8)',
                                        zIndex: 200
                                    }}
                                >
                                    <div style={{padding: '8px', background: '#1a1a1a'}}>
                                        <input
                                            autoFocus
                                            placeholder="Search coin (e.g. BTC)..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%',
                                                background: '#080808',
                                                border: '1px solid #333',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                outline: 'none',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div style={{maxHeight: '250px', overflowY: 'auto'}}>
                                        {filteredMarkets.length > 0 ? (
                                            filteredMarkets.map((m) => (
                                                <div
                                                    key={m}
                                                    onClick={() => {
                                                        setSymbol(m);
                                                        setIsMarketOpen(false);
                                                        setSearchTerm("");
                                                    }}
                                                    style={{
                                                        padding: '12px 15px',
                                                        color: symbol === m ? '#FFD700' : '#ccc',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #1a1a1a',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontWeight: symbol === m ? 'bold' : 'normal'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#1a1a1a';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    <span>{m}</span>
                                                    {symbol === m && <span>✓</span>}
                                                </div>
                                            ))
                                        ) : (
                                            <div
                                                style={{
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    color: '#444',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                No assets found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px'}}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{color: '#444', fontSize: '10px', fontWeight: 'bold'}}>
                                    MARGIN (USDT)
                                </span>
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <button
                                        onClick={() => setAmount((balance * 0.5).toFixed(2))}
                                        style={{
                                            background: '#1a1a1a',
                                            border: 'none',
                                            color: '#888',
                                            fontSize: '8px',
                                            padding: '3px 6px',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        50%
                                    </button>
                                    <button
                                        onClick={() => setAmount(balance.toFixed(2))}
                                        style={{
                                            background: 'rgba(0, 255, 163, 0.1)',
                                            border: '1px solid rgba(0, 255, 163, 0.2)',
                                            color: '#00ffa3',
                                            fontSize: '9px',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        ALL-IN
                                    </button>
                                </div>
                            </div>

                            <div style={{position: 'relative'}}>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Min. 10.00"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '.');
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val);
                                    }}
                                    style={{
                                        width: '100%',
                                        background: '#161616',
                                        border: '1px solid #222',
                                        padding: '14px',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        outline: 'none',
                                        fontFamily: 'JetBrains Mono, monospace',
                                        transition: '0.2s'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#444';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#222';
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        right: '15px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#444',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    USDT
                                </span>
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                background: '#161616',
                                padding: '4px',
                                borderRadius: '8px',
                                marginTop: '5px'
                            }}
                        >
                            {['MARKET', 'LIMIT'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setOrderType(type)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: orderType === type ? '#222' : 'transparent',
                                        border: 'none',
                                        color: orderType === type ? '#FFD700' : '#666',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        boxShadow: orderType === type ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {orderType === 'LIMIT' && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    background: 'rgba(255, 215, 0, 0.02)',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px dashed rgba(255, 215, 0, 0.2)'
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: '10px',
                                        color: '#FFD700',
                                        fontWeight: 'bold',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    TARGET PRICE
                                </label>
                                <div style={{position: 'relative'}}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={targetPrice}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/,/g, '.');
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) setTargetPrice(val);
                                        }}
                                        style={{
                                            width: '100%',
                                            background: '#080808',
                                            border: '1px solid #FFD700',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            outline: 'none',
                                            fontFamily: 'JetBrains Mono, monospace'
                                        }}
                                    />
                                    <span
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#444',
                                            fontSize: '10px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        USDT
                                    </span>
                                </div>
                            </div>
                        )}

                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px'}}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <span
                                        style={{
                                            color: '#444',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            letterSpacing: '1px'
                                        }}
                                    >
                                        ADJUST LEVERAGE
                                    </span>
                                    <div
                                        style={{
                                            padding: '2px 5px',
                                            background:
                                                leverage > 50
                                                    ? 'rgba(255, 77, 77, 0.1)'
                                                    : 'rgba(0, 255, 163, 0.1)',
                                            borderRadius: '3px'
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '8px',
                                                color: leverage > 50 ? '#ff4d4d' : '#00ffa3',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {leverage > 50 ? 'HIGH RISK' : 'NORMAL'}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        color: '#fff',
                                        fontSize: '16px',
                                        fontWeight: '900',
                                        fontFamily: 'JetBrains Mono, monospace'
                                    }}
                                >
                                    <span style={{color: '#FFD700'}}>{leverage}</span>
                                    <span style={{fontSize: '10px', color: '#444', marginLeft: '2px'}}>x</span>
                                </div>
                            </div>

                            <div style={{position: 'relative', padding: '10px 0 20px 0'}}>
                                <div
                                    style={{
                                        height: '4px',
                                        width: '100%',
                                        background: '#1a1a1a',
                                        borderRadius: '2px',
                                        position: 'relative'
                                    }}
                                >
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${((leverage - 1) / 99) * 100}%`,
                                            background: 'linear-gradient(90deg, #FFD700 0%, #ff8c00 100%)',
                                            borderRadius: '2px',
                                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
                                            transition: 'width 0.2s ease-out'
                                        }}
                                    />
                                </div>

                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={leverage}
                                    onChange={(e) => setLeverage(Number(e.target.value))}
                                    style={{
                                        position: 'absolute',
                                        top: '6px',
                                        left: 0,
                                        width: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        zIndex: 10
                                    }}
                                />

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        position: 'absolute',
                                        top: '10px',
                                        left: 0,
                                        right: 0,
                                        padding: '0 2px'
                                    }}
                                >
                                    {[1, 25, 50, 75, 100].map((step) => (
                                        <div
                                            key={step}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '2px',
                                                    height: '6px',
                                                    background: leverage >= step ? '#FFD700' : '#333'
                                                }}
                                            />
                                            <span
                                                onClick={() => setLeverage(step)}
                                                style={{
                                                    fontSize: '9px',
                                                    color: leverage >= step ? '#fff' : '#444',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {step}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px'}}>
                                {[10, 20, 50, 100].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setLeverage(val)}
                                        style={{
                                            padding: '8px 0',
                                            background: leverage === val ? '#FFD700' : '#161616',
                                            border: '1px solid',
                                            borderColor: leverage === val ? '#FFD700' : '#222',
                                            color: leverage === val ? '#000' : '#888',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: '900',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {val}x
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px'}}>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                                <div
                                    style={{
                                        background: 'rgba(0, 255, 163, 0.03)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(0, 255, 163, 0.1)'
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '8px',
                                            color: '#00ffa3',
                                            fontWeight: 'bold',
                                            display: 'block',
                                            marginBottom: '4px'
                                        }}
                                    >
                                        TAKE PROFIT
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={tpPrice}
                                        onChange={(e) => setTpPrice(e.target.value.replace(/,/g, '.'))}
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '12px',
                                            outline: 'none',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        background: 'rgba(255, 77, 77, 0.03)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 77, 77, 0.1)'
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '8px',
                                            color: '#ff4d4d',
                                            fontWeight: 'bold',
                                            display: 'block',
                                            marginBottom: '4px'
                                        }}
                                    >
                                        STOP LOSS
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={slPrice}
                                        onChange={(e) => setSlPrice(e.target.value.replace(/,/g, '.'))}
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '12px',
                                            outline: 'none',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px'}}>
                            <button
                                onClick={() => handleOpenTrade('LONG')}
                                disabled={loading}
                                style={{
                                    padding: '14px',
                                    background: 'linear-gradient(90deg, #00ffa3 0%, #00d186 100%)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '900',
                                    fontSize: '13px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: '0.2s'
                                }}
                            >
                                {loading ? "PROCESSING..." : "BUY / LONG"}
                            </button>

                            <button
                                onClick={() => handleOpenTrade('SHORT')}
                                disabled={loading}
                                style={{
                                    padding: '14px',
                                    background: 'linear-gradient(90deg, #ff4d4d 0%, #d43b3b 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '900',
                                    fontSize: '13px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: '0.2s'
                                }}
                            >
                                {loading ? "PROCESSING..." : "SELL / SHORT"}
                            </button>

                            <div
                                style={{
                                    background: '#111',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    marginTop: '5px',
                                    border: '1px solid #1a1a1a'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <span style={{fontSize: '9px', color: '#444', fontWeight: 'bold'}}>
                                        FEE (0.04%)
                                    </span>
                                    <span style={{fontSize: '9px', color: '#888'}}>
                                        {((parseFloat(amount) || 0) * (parseFloat(leverage) || 1) * 0.0004).toFixed(2)} USDT
                                    </span>
                                </div>

                                <div style={{display: 'flex', justifyContent: 'space-between', gap: '8px'}}>
                                    <span style={{fontSize: '9px', color: '#444', fontWeight: 'bold'}}>
                                        EST. LIQUIDATION
                                    </span>

                                    <div style={{fontSize: '10px', textAlign: 'right', fontWeight: 'bold'}}>
                                        {(() => {
                                            const entry = safeParseNumber(targetPrice);
                                            const lev = parseFloat(leverage) || 1;

                                            if (orderType === 'MARKET' || !entry || entry <= 0) {
                                                return <span style={{color: '#666'}}>Set limit price</span>;
                                            }

                                            const liqLong = entry * (1 - 0.94 / lev);
                                            const liqShort = entry * (1 + 0.94 / lev);

                                            return (
                                                <>
                                                    <div style={{color: '#00ffa3'}}>
                                                        L: {liqLong.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                    </div>
                                                    <div style={{color: '#ff4d4d'}}>
                                                        S: {liqShort.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {renderEditModal()}
        </div>
    );
};

export default TradeTerminal;