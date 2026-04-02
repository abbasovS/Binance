import { useEffect, useState } from 'react';

// onCoinClick funksiyasını qəbul edirik ki, UserPage.jsx-də kliklənəndə analiz modalını aça bilək
const TickerBar = ({ onCoinClick }) => {
    const [gainers, setGainers] = useState([]);
    const [losers, setLosers] = useState([]);
    const [view, setView] = useState('gainers');
    const [isHovered, setIsHovered] = useState(false); // Kayan yazını dayandırmaq üçün

    useEffect(() => {
        const fetchMarketData = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
                const data = await res.json();

                const validCoins = data.filter(d =>
                    d.symbol.endsWith('USDT') &&
                    parseFloat(d.lastPrice) > 0 &&
                    parseFloat(d.quoteVolume) > 1_000_000
                ).map(d => ({
                    symbol: d.symbol.replace('USDT', ''),
                    price: parseFloat(d.lastPrice),
                    change: parseFloat(d.priceChangePercent),
                }));

                // Brauzer Tab (Title) üçün BTC qiymətini tapırıq
                const btcData = validCoins.find(c => c.symbol === 'BTC');
                if (btcData) {
                    const isUp = btcData.change >= 0;
                    document.title = `${isUp ? '🟢' : '🔴'} $${btcData.price.toLocaleString(undefined, { maximumFractionDigits: 0 })} | MockFolio`;
                }

                const topGainers = [...validCoins].sort((a, b) => b.change - a.change).slice(0, 15);
                const topLosers = [...validCoins].sort((a, b) => a.change - b.change).slice(0, 15);

                setGainers(topGainers);
                setLosers(topLosers);
            } catch (e) {
                console.error('Ticker fetch error:', e);
            }
        };

        fetchMarketData();
        const interval = setInterval(fetchMarketData, 20000); // 20 saniyəyə saldım ki, daha dinamik olsun

        return () => {
            clearInterval(interval);
            document.title = "MockFolio - Crypto Terminal"; // Komponentdən çıxanda adı sıfırla
        };
    }, []);

    if (gainers.length === 0 && losers.length === 0) return null;

    const activeCoins = view === 'gainers' ? gainers : losers;

    return (
        <div style={{
            width: '100%', background: '#020617', borderBottom: '1px solid rgba(255,255,255,0.06)',
            height: '38px', display: 'flex', alignItems: 'center', position: 'relative',
        }}>

            {/* SOL TƏRƏF: KONTROL DÜYMƏLƏRİ */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 15px',
                background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)',
                height: '100%', zIndex: 10, boxShadow: '8px 0 20px rgba(0,0,0,0.6)'
            }}>
                <button
                    onClick={() => setView('gainers')}
                    style={{
                        background: view === 'gainers' ? 'rgba(2,192,118,0.15)' : 'transparent',
                        color: view === 'gainers' ? '#02c076' : '#64748b', border: 'none', padding: '4px 10px',
                        borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: '0.2s',
                    }}>
                    🔥 GAINERS
                </button>
                <button
                    onClick={() => setView('losers')}
                    style={{
                        background: view === 'losers' ? 'rgba(248,73,96,0.15)' : 'transparent',
                        color: view === 'losers' ? '#f84960' : '#64748b', border: 'none', padding: '4px 10px',
                        borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: '0.2s',
                    }}>
                    🩸 LOSERS
                </button>
            </div>

            {/* SAĞ TƏRƏF: KAYAN YAZILAR (Maus üzərinə gələndə dayanır) */}
            <div
                style={{ overflow: 'hidden', flex: 1, display: 'flex', height: '100%', alignItems: 'center' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div
                    key={view}
                    style={{
                        display: 'inline-flex',
                        // Maus üzərindədirsə 'paused' olur, deyilsə 'running'
                        animation: `ticker-scroll 60s linear infinite ${isHovered ? 'paused' : 'running'}`,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {[...activeCoins, ...activeCoins].map((coin, idx) => {
                        const isPositive = coin.change >= 0;
                        const colorCode = isPositive ? '#02c076' : '#f84960';
                        const bgColor = isPositive ? 'rgba(2,192,118,0.08)' : 'rgba(248,73,96,0.08)';

                        return (
                            <div
                                key={idx}
                                // Əgər prop olaraq onCoinClick göndərilibsə onu çağırırıq
                                onClick={() => onCoinClick && onCoinClick(coin.symbol)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '0 24px', height: '38px', cursor: 'pointer',
                                    borderRight: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.2s ease',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1', letterSpacing: '0.5px' }}>
                                    {coin.symbol}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>
                                    ${coin.price.toLocaleString(undefined, {
                                    minimumFractionDigits: coin.price < 1 ? 4 : 2,
                                    maximumFractionDigits: coin.price < 1 ? 4 : 2
                                })}
                                </span>
                                <span style={{
                                    fontSize: '11px', fontWeight: '800', color: colorCode,
                                    background: bgColor, padding: '2px 6px', borderRadius: '4px'
                                }}>
                                    {isPositive ? '+' : ''}{coin.change.toFixed(2)}%
                                </span>
                            </div>
                        )
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