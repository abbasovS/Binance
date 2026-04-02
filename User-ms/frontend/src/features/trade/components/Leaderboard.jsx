import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tradeApi } from '../../../api';

const Leaderboard = ({ dbTraders = [], isRegistered, onJoinClick, onStartTrade }) => {
    const emeraldGreen = "#00ffa3";
    const glassBg = "rgba(30, 34, 40, 0.7)";

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [traderHistory, setTraderHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [contestStatus, setContestStatus] = useState({ status: 'ACTIVE', message: 'Loading...', targetDate: null });
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const currentUsername = localStorage.getItem('currentUsername');

    useEffect(() => {
        if (historyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [historyModalOpen]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await tradeApi.getContestStatus();
                if (res.data) setContestStatus(res.data);
            } catch (err) {
                console.error("Contest status could not be read:", err);
            }
        };
        fetchStatus();
    }, []);

    useEffect(() => {
        if (!contestStatus.targetDate) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const target = new Date(contestStatus.targetDate).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                clearInterval(interval);
            } else {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [contestStatus.targetDate]);

    const formatEquity = (num) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num || 0);
    };

    const openHistoryModal = async (trader) => {
        if (!trader.id) {
            toast.error("User data not found!");
            return;
        }

        setSelectedTrader(trader);
        setHistoryModalOpen(true);
        setLoadingHistory(true);

        try {
            const res = await tradeApi.getPublicTradeHistory(trader.id);
            setTraderHistory(res.data || []);
        } catch (err) {
            console.error("Trade history could not be fetched:", err);
            toast.error("Error occurred while loading trade history.");
            setTraderHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const getBannerTitle = () => {
        if (contestStatus.status === 'LOCKED') return "SEASON ENDED (CALCULATING)";
        if (contestStatus.status === 'REGISTRATION') return isRegistered ? "REGISTRATION CONFIRMED" : "NEW SEASON REGISTRATION";
        return isRegistered ? "SYSTEM ACTIVE" : "SEASON 1: THE BEGINNING";
    };

    const getBannerDesc = () => {
        if (contestStatus.status === 'LOCKED') return "All trades are suspended. Winners are being calculated and rewards distributed...";
        if (contestStatus.status === 'REGISTRATION') return isRegistered ? "Wait for the competition to start. Good luck!" : "Join the race to enter the ranking. Entry is free.";
        return isRegistered ? `A virtual balance of $${formatEquity(10000)} has been credited to your account. You can start trading.` : "The competition has started, but you can still join.";
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{
                background: isRegistered
                    ? glassBg
                    : 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(22, 26, 30, 1) 100%)',
                padding: '40px 45px',
                borderRadius: '30px',
                border: isRegistered ? `1px solid rgba(0, 255, 163, 0.4)` : '1px solid rgba(255, 215, 0, 0.3)',
                backdropFilter: 'blur(20px)',
                marginBottom: '50px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: isRegistered ? `0 20px 40px rgba(0, 255, 163, 0.1)` : '0 20px 40px rgba(255, 215, 0, 0.05)',
                transition: 'all 0.4s ease',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div style={{ flex: '1 1 300px' }}>
                    <h2 style={{
                        color: contestStatus.status === 'LOCKED' ? '#f84960' : isRegistered ? emeraldGreen : '#FFD700',
                        fontSize: '24px',
                        margin: 0,
                        fontWeight: '950',
                        textShadow: contestStatus.status === 'LOCKED' ? '0 0 20px rgba(248,73,96,0.3)' : isRegistered ? '0 0 20px rgba(0,255,163,0.3)' : '0 0 20px rgba(255,215,0,0.3)'
                    }}>
                        {getBannerTitle()}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '10px', fontWeight: '500' }}>
                        {getBannerDesc()}
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
                    {contestStatus.targetDate && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', letterSpacing: '1px' }}>
                                {contestStatus.message}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '40px' }}>
                                    <div style={{ color: '#FFD700', fontSize: '18px', fontWeight: '900', fontFamily: 'JetBrains Mono, monospace' }}>{timeLeft.days.toString().padStart(2, '0')}</div>
                                    <div style={{ color: '#888', fontSize: '9px', fontWeight: '700' }}>DAYS</div>
                                </div>
                                <span style={{ color: 'rgba(255,215,0,0.3)', fontWeight: 'bold', fontSize: '18px' }}>:</span>

                                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '40px' }}>
                                    <div style={{ color: '#FFD700', fontSize: '18px', fontWeight: '900', fontFamily: 'JetBrains Mono, monospace' }}>{timeLeft.hours.toString().padStart(2, '0')}</div>
                                    <div style={{ color: '#888', fontSize: '9px', fontWeight: '700' }}>HRS</div>
                                </div>
                                <span style={{ color: 'rgba(255,215,0,0.3)', fontWeight: 'bold', fontSize: '18px' }}>:</span>

                                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '40px' }}>
                                    <div style={{ color: '#FFD700', fontSize: '18px', fontWeight: '900', fontFamily: 'JetBrains Mono, monospace' }}>{timeLeft.minutes.toString().padStart(2, '0')}</div>
                                    <div style={{ color: '#888', fontSize: '9px', fontWeight: '700' }}>MIN</div>
                                </div>
                                <span style={{ color: 'rgba(255,215,0,0.3)', fontWeight: 'bold', fontSize: '18px' }}>:</span>

                                <div style={{ background: 'rgba(0, 255, 163, 0.05)', border: '1px solid rgba(0, 255, 163, 0.25)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '40px', boxShadow: '0 0 10px rgba(0, 255, 163, 0.1)' }}>
                                    <div style={{ color: '#00ffa3', fontSize: '18px', fontWeight: '900', fontFamily: 'JetBrains Mono, monospace' }}>{timeLeft.seconds.toString().padStart(2, '0')}</div>
                                    <div style={{ color: '#888', fontSize: '9px', fontWeight: '700' }}>SEC</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        {contestStatus.status === 'LOCKED' ? (
                            <button
                                disabled
                                style={{
                                    background: 'rgba(248,73,96,0.1)', color: '#f84960', border: '1px solid rgba(248,73,96,0.3)', padding: '16px 40px',
                                    borderRadius: '14px', fontWeight: '900', cursor: 'not-allowed', fontSize: '13px'
                                }}
                            >
                                CONTEST ENDED
                            </button>
                        ) : contestStatus.status === 'REGISTRATION' && isRegistered ? (
                            <button
                                disabled
                                style={{
                                    background: 'rgba(255,215,0,0.1)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)', padding: '16px 40px',
                                    borderRadius: '14px', fontWeight: '900', cursor: 'not-allowed', fontSize: '13px'
                                }}
                            >
                                WAITING FOR START
                            </button>
                        ) : isRegistered ? (
                            <button
                                onClick={onStartTrade}
                                style={{
                                    background: emeraldGreen, color: '#000', border: 'none', padding: '16px 48px',
                                    borderRadius: '14px', fontWeight: '900', cursor: 'pointer', transition: '0.2s',
                                    boxShadow: '0 10px 20px rgba(0,255,163,0.2)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-3px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                START TRADING
                            </button>
                        ) : (
                            <button
                                onClick={onJoinClick}
                                style={{
                                    background: '#FFD700', color: '#000', border: 'none', padding: '15px 40px',
                                    borderRadius: '12px', fontWeight: '900', cursor: 'pointer', transition: '0.2s',
                                    boxShadow: '0 10px 20px rgba(255,215,0,0.2)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-3px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                JOIN TOURNAMENT
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <th style={{ padding: '20px', textAlign: 'left', fontWeight: '800' }}>Rank</th>
                        <th style={{ padding: '20px', textAlign: 'left', fontWeight: '800' }}>Trader</th>
                        <th style={{ padding: '20px', textAlign: 'right', fontWeight: '800' }}>Equity</th>
                        <th style={{ padding: '20px', textAlign: 'right', fontWeight: '800' }}>ROI</th>
                        <th style={{ padding: '20px', textAlign: 'center', fontWeight: '800' }}>Win Rate</th>
                        <th style={{ padding: '20px', textAlign: 'right', fontWeight: '800' }}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(dbTraders || []).map((trader, index) => {
                        const isMe = isRegistered && trader.username && currentUsername && trader.username === currentUsername;
                        const roiVal = trader.roi || 0;
                        const winRateVal = trader.winRate || 0;

                        return (
                            <tr
                                key={trader.id || index}
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    backgroundColor: isMe ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                                    borderLeft: isMe ? '5px solid #FFD700' : '5px solid transparent',
                                    boxShadow: isMe ? 'inset 0 0 20px rgba(255,215,0,0.1)' : 'none',
                                    transition: 'background 0.3s ease'
                                }}
                            >
                                <td style={{ padding: '20px', color: isMe ? '#fff' : '#FFD700', fontWeight: '900', fontSize: '16px' }}>
                                    #{index + 1}
                                </td>
                                <td style={{ padding: '20px', color: '#fff', fontWeight: isMe ? '900' : '600', fontSize: isMe ? '16px' : '15px' }}>
                                    {trader.username}
                                    {isMe && (
                                        <span style={{
                                            marginLeft: '12px',
                                            fontSize: '11px',
                                            background: '#FFD700',
                                            color: '#000',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontWeight: '900',
                                            boxShadow: '0 0 10px rgba(255,215,0,0.6)',
                                            letterSpacing: '0.5px'
                                        }}>
                                            YOU
                                        </span>
                                    )}
                                </td>
                                <td style={{
                                    padding: '20px',
                                    textAlign: 'right',
                                    fontWeight: '900',
                                    color: isMe ? '#FFD700' : '#fff',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: isMe ? '18px' : '16px'
                                }}>
                                    ${formatEquity(trader.equity ?? trader.virtualBalance)}
                                </td>

                                <td style={{
                                    padding: '20px',
                                    textAlign: 'right',
                                    fontWeight: '900',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '14px',
                                    color: roiVal === 0 ? '#888' : (roiVal > 0 ? emeraldGreen : '#f84960')
                                }}>
                                    {roiVal > 0 ? '+' : ''}{roiVal.toFixed(2)}%
                                </td>

                                <td style={{ padding: '20px', textAlign: 'center', fontWeight: '800' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        background: winRateVal >= 50 ? 'rgba(0, 255, 163, 0.1)' : (winRateVal === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(248, 73, 96, 0.1)'),
                                        color: winRateVal >= 50 ? emeraldGreen : (winRateVal === 0 ? '#888' : '#f84960'),
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}>
                                        {winRateVal.toFixed(1)}% Win
                                    </div>
                                </td>

                                <td style={{ padding: '20px', textAlign: 'right' }}>
                                    <button
                                        onClick={() => openHistoryModal(trader)}
                                        style={{
                                            background: isMe ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                                            border: isMe ? '1px solid rgba(255,215,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                            color: isMe ? '#FFD700' : '#fff',
                                            borderRadius: '8px',
                                            padding: '8px 16px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: '800',
                                            transition: '0.2s',
                                            letterSpacing: '0.5px'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,215,0,0.2)'}
                                        onMouseLeave={(e) => e.target.style.background = isMe ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'}
                                    >
                                        👁️ HISTORY
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {(!dbTraders || dbTraders.length === 0) && (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#888', fontWeight: '600' }}>
                                The leaderboard is currently empty. Be the first to join!
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {historyModalOpen && (
                <div
                    onClick={() => setHistoryModalOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#161a1e',
                            width: '800px',
                            borderRadius: '24px',
                            border: '1px solid #2b3139',
                            padding: '35px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #2b3139', paddingBottom: '15px' }}>
                            <div>
                                <h3 style={{ color: '#fff', margin: 0, fontSize: '22px', fontWeight: '900' }}>
                                    {selectedTrader?.username} <span style={{ color: '#FFD700' }}>- TRADE HISTORY</span>
                                </h3>
                                <p style={{ color: '#848e9c', fontSize: '13px', margin: '5px 0 0 0', fontWeight: '500' }}>Only closed positions are shown (Last 50)</p>
                            </div>
                            <button onClick={() => setHistoryModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '36px', height: '36px', border: 'none', color: '#848e9c', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseOver={(e)=>{e.target.style.color='#fff'; e.target.style.background='rgba(255,255,255,0.1)'}} onMouseOut={(e)=>{e.target.style.color='#848e9c'; e.target.style.background='rgba(255,255,255,0.05)'}}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                            {loadingHistory ? (
                                <div style={{ textAlign: 'center', color: '#FFD700', padding: '60px', fontWeight: 'bold', fontSize: '16px' }}>Loading...</div>
                            ) : traderHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#848e9c', padding: '60px', fontSize: '15px', fontWeight: '500' }}>This user has no closed trades yet.</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr style={{ borderBottom: '1px solid #2b3139', color: '#848e9c', fontSize: '11px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        <th style={{ padding: '15px 0', fontWeight: '800' }}>Asset</th>
                                        <th style={{ padding: '15px 0', fontWeight: '800' }}>Side</th>
                                        <th style={{ padding: '15px 0', fontWeight: '800' }}>Entry/Close</th>
                                        <th style={{ padding: '15px 0', fontWeight: '800' }}>Margin (Lev)</th>
                                        <th style={{ padding: '15px 0', textAlign: 'right', fontWeight: '800' }}>Result (PnL)</th>
                                    </tr>
                                    </thead>
                                    <tbody style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                    {traderHistory.map((trade, idx) => (
                                        <tr key={trade.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', padding: '16px 0' }}>
                                                {trade.symbol}
                                            </td>
                                            <td style={{ color: trade.side === 'LONG' ? '#02c076' : '#f84960', fontSize: '13px', fontWeight: '900' }}>
                                                {trade.side}
                                            </td>
                                            <td>
                                                <div style={{ color: '#848e9c', fontSize: '12px', marginBottom: '3px' }}>En: <span style={{color: '#e2e8f0'}}>${formatEquity(trade.entryPrice)}</span></div>
                                                <div style={{ color: '#848e9c', fontSize: '12px' }}>Ex: <span style={{color: '#e2e8f0'}}>${formatEquity(trade.closePrice)}</span></div>
                                            </td>
                                            <td style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '600' }}>
                                                ${trade.margin} <span style={{ color: '#64748b', marginLeft: '4px' }}>({trade.leverage}x)</span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '15px', color: trade.pnl >= 0 ? '#02c076' : '#f84960' }}>
                                                {trade.pnl > 0 ? '+' : ''}{formatEquity(trade.pnl)} USDT
                                                <div style={{ fontSize: '10px', color: '#848e9c', marginTop: '4px', fontWeight: '600' }}>{trade.status}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;