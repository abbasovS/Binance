import React, { useEffect, useRef, useState } from 'react';

function PriceList({ activeTab, topGainers, topLosers, prices }) {
    const prevPricesRef = useRef({});
    const [highlight, setHighlight] = useState({});

    const getActiveData = () => {
        switch(activeTab) {
            case 'gainers': return topGainers;
            case 'losers': return topLosers;
            case 'live': return prices;
            default: return [];
        }
    };

    const data = getActiveData();

    useEffect(() => {
        const newHighlights = {};
        data.forEach(item => {
            const symbol = item.symbol;
            const currentPrice = parseFloat(item.price || item.lastPrice);
            const prevPrice = prevPricesRef.current[symbol];

            if (prevPrice && currentPrice !== prevPrice) {
                newHighlights[symbol] = currentPrice > prevPrice ? 'rgba(2, 192, 118, 0.15)' : 'rgba(248, 73, 96, 0.15)';
            }
            prevPricesRef.current[symbol] = currentPrice;
        });

        if (Object.keys(newHighlights).length > 0) {
            setHighlight(newHighlights);
            const timer = setTimeout(() => setHighlight({}), 400);
            return () => clearTimeout(timer);
        }
    }, [data]);

    return (
        <div style={{ width: '100%', userSelect: 'none' }}>
            {/* Cədvəl Başlığı (Sticky) */}
            <div style={{
                display: 'flex',
                padding: '10px 16px',
                fontSize: '11px',
                color: '#848e9c',
                fontWeight: '500',
                borderBottom: '1px solid #2b3139',
                position: 'sticky',
                top: 0,
                background: '#1e2329',
                zIndex: 10
            }}>
                <span style={{ flex: 1.5 }}>Cütlük</span>
                <span style={{ flex: 2, textAlign: 'right' }}>Qiymət</span>
                <span style={{ flex: 1.2, textAlign: 'right' }}>Dəyişim</span>
            </div>

            {/* Siyahı */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.length > 0 ? data.map((item, index) => {
                    const price = parseFloat(item.price || item.lastPrice || 0);
                    const change = parseFloat(item.change || item.priceChangePercent || 0);
                    const isPositive = change >= 0;
                    const symbol = item.symbol.replace('USDT', '');
                    const rowBg = highlight[item.symbol] || 'transparent';

                    return (
                        <div key={index} style={{
                            display: 'flex',
                            padding: '10px 16px',
                            fontSize: '13px',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                            background: rowBg,
                            transition: 'background 0.4s ease',
                            cursor: 'pointer'
                        }}
                             onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                             onMouseOut={(e) => e.currentTarget.style.background = rowBg}
                        >
                            {/* Asset Name */}
                            <div style={{ flex: 1.5, display: 'flex', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: '700', color: '#fff' }}>{symbol}</span>
                                <span style={{ fontSize: '10px', color: '#474d57', marginLeft: '2px' }}>/USDT</span>
                            </div>

                            {/* Price */}
                            <div style={{
                                flex: 2,
                                textAlign: 'right',
                                fontFamily: '"Roboto Mono", monospace',
                                fontWeight: '500',
                                color: isPositive ? '#02c076' : '#f84960'
                            }}>
                                {price < 1 ? price.toFixed(6) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>

                            {/* Change % */}
                            <div style={{
                                flex: 1.2,
                                textAlign: 'right',
                                fontWeight: '600',
                                color: isPositive ? '#02c076' : '#f84960'
                            }}>
                                {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </div>
                        </div>
                    );
                }) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#848e9c', fontSize: '12px' }}>
                        Datalar yüklənir...
                    </div>
                )}
            </div>
        </div>
    );
}

export default PriceList;