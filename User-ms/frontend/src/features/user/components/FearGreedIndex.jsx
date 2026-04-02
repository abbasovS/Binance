import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { marketApi } from '../../../api';

const FearGreedIndex = ({ isOpen, onClose }) => {
    const [data, setData] = useState({ value: 50, classification: 'Neutral' });
    const [marketData, setMarketData] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Real API Fetch
            marketApi.getFearGreedIndex().then(res => {
                if (res.data.data?.[0]) {
                    setData({
                        value: parseInt(res.data.data[0].value),
                        classification: res.data.data[0].value_classification
                    });
                }
            });
            marketApi.getTopCoins().then(res => setMarketData(res.data));

            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Premium Theme Logic
    const getTheme = (val) => {
        if (val <= 25) return { color: '#FF3B30', label: 'Extreme Fear', glow: 'rgba(255, 59, 48, 0.25)' };
        if (val <= 45) return { color: '#FF9500', label: 'Fear', glow: 'rgba(255, 149, 0, 0.2)' };
        if (val <= 55) return { color: '#D4AF37', label: 'Neutral', glow: 'rgba(212, 175, 55, 0.15)' };
        if (val <= 75) return { color: '#34C759', label: 'Greed', glow: 'rgba(52, 199, 89, 0.2)' };
        return { color: '#007AFF', label: 'Extreme Greed', glow: 'rgba(0, 122, 255, 0.25)' };
    };

    const theme = getTheme(data.value);

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 4, 6, 0.8)',
            backdropFilter: 'blur(20px) saturate(180%)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000000
        }} onClick={onClose}>

            <div style={{
                width: '420px', background: 'linear-gradient(165deg, #0f1115 0%, #050608 100%)',
                borderRadius: '35px', padding: '40px 35px', position: 'relative',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: `0 50px 100px rgba(0,0,0,0.9), 0 0 60px ${theme.glow}`,
                animation: 'nexusUltraPop 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Arxa fon ambient işığı */}
                <div style={{
                    position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
                    width: '300px', height: '150px', background: theme.glow,
                    filter: 'blur(80px)', pointerEvents: 'none', transition: 'background 1s ease'
                }} />

                {/* ÜST BAŞLIQ */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                    <div>
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '100px',
                            display: 'inline-block', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px'
                        }}>
                            <span style={{ color: '#848e9c', fontSize: '10px', fontWeight: '900', letterSpacing: '2px' }}>NEXUS INTELLIGENCE</span>
                        </div>
                        <h2 style={{ color: '#fff', margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>Market Sentiment</h2>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)', border: 'none', color: '#848e9c',
                        width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                        fontSize: '18px', transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onMouseOver={e => e.target.style.color = '#fff'}>✕</button>
                </div>

                {/* GAUGE AREA */}
                <div style={{ position: 'relative', textAlign: 'center', height: '180px', display: 'flex', justifyContent: 'center' }}>
                    <svg width="300" height="160" viewBox="0 0 240 120">
                        {/* Əsas boz qövs */}
                        <path d="M 30 110 A 90 90 0 0 1 210 110" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="14" strokeLinecap="round" />

                        {/* Rəngli proqress qövsü */}
                        <path
                            d="M 30 110 A 90 90 0 0 1 210 110" fill="none" stroke={theme.color} strokeWidth="14" strokeLinecap="round"
                            strokeDasharray="283" strokeDashoffset={283 - (283 * data.value) / 100}
                            style={{
                                transition: 'stroke-dashoffset 2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                filter: `drop-shadow(0 0 12px ${theme.color})`
                            }}
                        />
                    </svg>

                    <div style={{ position: 'absolute', top: '75px', textAlign: 'center' }}>
                        <div style={{ fontSize: '72px', fontWeight: '800', color: '#fff', letterSpacing: '-4px', lineHeight: 1 }}>{data.value}</div>
                        <div style={{
                            fontSize: '12px', color: theme.color, fontWeight: '900',
                            letterSpacing: '4px', textTransform: 'uppercase', marginTop: '5px'
                        }}>
                            {theme.label}
                        </div>
                    </div>
                </div>

                {/* COIN STRIPS - 2 Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '25px', position: 'relative' }}>
                    {marketData.map((coin) => (
                        <div key={coin.id} style={{
                            padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px',
                            border: '1px solid rgba(255,255,255,0.04)', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', transition: '0.3s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={coin.image} style={{ width: '22px', height: '22px', borderRadius: '50%', filter: 'grayscale(30%)' }} alt="" />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{coin.symbol.toUpperCase()}</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: coin.price_change_percentage_24h > 0 ? '#34C759' : '#FF3B30' }}>
                                {coin.price_change_percentage_24h > 0 ? '↑' : '↓'} {Math.abs(coin.price_change_percentage_24h).toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>

                {/* PREMIUM INSIGHT BOX */}
                <div style={{
                    padding: '20px', borderRadius: '22px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)', position: 'relative', borderLeft: `4px solid ${theme.color}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🛡️</span>
                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px' }}>Market Advisory</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                        Sentiment identifies a <b style={{color: theme.color}}>{theme.label}</b> zone. {data.value > 75 ? 'History suggests extreme greed often precedes a healthy correction.' : 'Accumulation patterns are forming in this volatility range.'}
                    </p>
                </div>

                <style>
                    {`
                        @keyframes nexusUltraPop {
                            from { opacity: 0; transform: scale(0.9) translateY(40px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        /* Scrollbar styling for the modal if content overflows */
                        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    `}
                </style>
            </div>
        </div>,
        document.body
    );
};

export default FearGreedIndex;