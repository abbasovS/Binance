import React, { useEffect, useMemo, useState } from 'react';
import { marketApi } from '../../../api';

function TickerBar({ onCoinClick }) {
    const [coins, setCoins] = useState([]);
    const [view, setView] = useState('gainers');
    const [isHovered, setIsHovered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const fetchTicker = async () => {
            try {
                const res = await marketApi.getTicker24h();
                const items = Array.isArray(res?.data) ? res.data : [];

                const mapped = items
                    .filter((item) => item?.symbol && item?.price != null && item?.change != null)
                    .map((item) => ({
                        symbol: item.symbol.replace('USDT', ''),
                        fullSymbol: item.symbol,
                        price: Number(item.price),
                        change: Number(item.change),
                    }))
                    .filter((item) => Number.isFinite(item.price) && Number.isFinite(item.change));

                if (!cancelled) {
                    if (mapped.length > 0) {
                        setCoins(mapped);
                    }
                    setHasError(mapped.length === 0);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Ticker fetch error:', error);
                if (!cancelled) {
                    setHasError(true);
                    setIsLoading(false);
                }
            }
        };

        fetchTicker();
        const interval = setInterval(fetchTicker, 15000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const activeCoins = useMemo(() => {
        const sorted = [...coins].sort((a, b) =>
            view === 'gainers' ? b.change - a.change : a.change - b.change
        );
        return sorted.slice(0, 10);
    }, [coins, view]);

    const renderPlaceholder = (text) => (
        <div className="tickerbar tickerbar--placeholder">
            <div className="tickerbar__controls">
                <button
                    onClick={() => setView('gainers')}
                    className={`tickerbar__toggle ${view === 'gainers' ? 'active gainers' : ''}`}
                >
                    Gainers
                </button>

                <button
                    onClick={() => setView('losers')}
                    className={`tickerbar__toggle ${view === 'losers' ? 'active losers' : ''}`}
                >
                    Losers
                </button>
            </div>

            <span className="tickerbar__placeholderText">{text}</span>
        </div>
    );

    if (isLoading && !activeCoins.length) {
        return renderPlaceholder('Ticker məlumatı yüklənir...');
    }

    if (!activeCoins.length) {
        return renderPlaceholder('Ticker məlumatı hazır deyil.');
    }

    return (
        <div className="tickerbar">
            <div className="tickerbar__controls">
                <button
                    onClick={() => setView('gainers')}
                    className={`tickerbar__toggle ${view === 'gainers' ? 'active gainers' : ''}`}
                >
                    Gainers
                </button>

                <button
                    onClick={() => setView('losers')}
                    className={`tickerbar__toggle ${view === 'losers' ? 'active losers' : ''}`}
                >
                    Losers
                </button>
            </div>

            <div
                className="tickerbar__viewport"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div
                    key={view}
                    className="tickerbar__track"
                    style={{
                        animationPlayState: isHovered ? 'paused' : 'running',
                    }}
                >
                    {[...activeCoins, ...activeCoins].map((coin, idx) => {
                        const isPositive = coin.change >= 0;
                        const priceText = coin.price.toLocaleString(undefined, {
                            minimumFractionDigits: coin.price < 1 ? 4 : 2,
                            maximumFractionDigits: coin.price < 1 ? 4 : 2,
                        });

                        return (
                            <div
                                key={`${coin.fullSymbol}-${idx}`}
                                onClick={() => onCoinClick && onCoinClick(coin.fullSymbol)}
                                className="tickerbar__item"
                                style={{ opacity: hasError ? 0.85 : 1 }}
                            >
                                <span className="tickerbar__symbol">{coin.symbol}</span>

                                <span className="tickerbar__price">
                                    ${priceText}
                                </span>

                                <span
                                    className={`tickerbar__change ${isPositive ? 'positive' : 'negative'}`}
                                >
                                    {isPositive ? '+' : ''}
                                    {coin.change.toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default TickerBar;