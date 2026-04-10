import { useEffect, useState } from 'react';
import { marketApi } from '../../../api';

const TickerBar = ({ onCoinClick }) => {
    const [gainers, setGainers] = useState([]);
    const [losers, setLosers] = useState([]);
    const [view, setView] = useState('gainers');
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchMarketData = async () => {
            try {
                const res = await marketApi.getTicker24h();
                const data = Array.isArray(res?.data) ? res.data : [];

                const validCoins = data
                    .filter((d) =>
                        d?.symbol?.endsWith('USDT') &&
                        parseFloat(d?.lastPrice) > 0 &&
                        parseFloat(d?.quoteVolume) > 1_000_000
                    )
                    .map((d) => ({
                        symbol: d.symbol.replace('USDT', ''),
                        price: parseFloat(d.lastPrice),
                        change: parseFloat(d.priceChangePercent),
                    }));

                if (!isMounted) return;

                const btcData = validCoins.find((c) => c.symbol === 'BTC');
                if (btcData) {
                    const isUp = btcData.change >= 0;
                    document.title = `${isUp ? '🟢' : '🔴'} $${btcData.price.toLocaleString(undefined, {
                        maximumFractionDigits: 0
                    })} | MockFolio`;
                }

                setGainers([...validCoins].sort((a, b) => b.change - a.change).slice(0, 15));
                setLosers([...validCoins].sort((a, b) => a.change - b.change).slice(0, 15));
            } catch (e) {
                console.error('Ticker fetch error:', e);
            }
        };

        fetchMarketData();
        const interval = setInterval(fetchMarketData, 20000);

        return () => {
            isMounted = false;
            clearInterval(interval);
            document.title = 'MockFolio - Premium Dashboard';
        };
    }, []);

    if (gainers.length === 0 && losers.length === 0) return null;

    const activeCoins = view === 'gainers' ? gainers : losers;

    return (
        <div
            style={{
                width: '100%',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.04)',
                    height: '100%',
                    zIndex: 10,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '100px',
                        padding: '3px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                >
                    <button
                        onClick={() => setView('gainers')}
                        style={{
                            background: view === 'gainers' ? 'rgba(88, 214, 141, 0.15)' : 'transparent',
                            color: view === 'gainers' ? '#58d68d' : 'rgba(255, 255, 255, 0.4)',
                            border: 'none',
                            padding: '4px 14px',
                            borderRadius: '100px',
                            fontSize: '11px',
                            fontWeight: view === 'gainers' ? '700' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        Gainers
                    </button>

                    <button
                        onClick={() => setView('losers')}
                        style={{
                            background: view === 'losers' ? 'rgba(255, 122, 122, 0.15)' : 'transparent',
                            color: view === 'losers' ? '#ff7a7a' : 'rgba(255, 255, 255, 0.4)',
                            border: 'none',
                            padding: '4px 14px',
                            borderRadius: '100px',
                            fontSize: '11px',
                            fontWeight: view === 'losers' ? '700' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                            <polyline points="17 18 23 18 23 12"></polyline>
                        </svg>
                        Losers
                    </button>
                </div>
            </div>

            <div
                style={{ overflow: 'hidden', flex: 1, display: 'flex', height: '100%', alignItems: 'center' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div
                    key={view}
                    style={{
                        display: 'inline-flex',
                        animation: `ticker-scroll 60s linear infinite ${isHovered ? 'paused' : 'running'}`,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {[...activeCoins, ...activeCoins].map((coin, idx) => {
                        const isPositive = coin.change >= 0;
                        const colorCode = isPositive ? '#58d68d' : '#ff7a7a';
                        const bgColor = isPositive ? 'rgba(88, 214, 141, 0.1)' : 'rgba(255, 122, 122, 0.1)';

                        return (
                            <div
                                key={`${coin.symbol}-${idx}`}
                                onClick={() => onCoinClick && onCoinClick(coin.symbol)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '0 24px',
                                    height: '42px',
                                    cursor: 'pointer',
                                    borderRight: '1px solid rgba(255,255,255,0.03)',
                                    transition: 'background 0.2s ease',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px' }}>
                                    {coin.symbol}
                                </span>

                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                                    ${coin.price.toLocaleString(undefined, {
                                    minimumFractionDigits: coin.price < 1 ? 4 : 2,
                                    maximumFractionDigits: coin.price < 1 ? 4 : 2
                                })}
                                </span>

                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        color: colorCode,
                                        background: bgColor,
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        border: `1px solid ${isPositive ? 'rgba(88, 214, 141, 0.2)' : 'rgba(255, 122, 122, 0.2)'}`
                                    }}
                                >
                                    {isPositive ? '+' : ''}
                                    {coin.change.toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes ticker-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};

export default TickerBar;