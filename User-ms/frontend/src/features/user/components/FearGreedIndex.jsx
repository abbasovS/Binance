import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { marketApi } from '../../../api';

const FearGreedIndex = ({ isOpen, onClose }) => {
    const [data, setData] = useState({ value: 50, classification: 'Neutral' });
    const [marketData, setMarketData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            try {
                setIsLoading(true);

                const [fearGreedRes, topCoinsRes] = await Promise.allSettled([
                    marketApi.getFearGreedIndex(),
                    marketApi.getTopCoins()
                ]);

                if (fearGreedRes.status === 'fulfilled' && fearGreedRes.value?.data?.data?.[0]) {
                    const item = fearGreedRes.value.data.data[0];
                    setData({
                        value: Number.parseInt(item.value, 10) || 50,
                        classification: item.value_classification || 'Neutral'
                    });
                }

                if (topCoinsRes.status === 'fulfilled' && Array.isArray(topCoinsRes.value?.data)) {
                    setMarketData(topCoinsRes.value.data.slice(0, 4));
                } else {
                    setMarketData([]);
                }
            } catch (error) {
                console.error('Fear & Greed data fetch failed:', error);
                setMarketData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    const theme = useMemo(() => {
        const value = Math.max(0, Math.min(100, data.value));

        if (value <= 25) {
            return {
                label: 'Extreme Fear',
                accent: '#f87171',
                accentSoft: 'rgba(248, 113, 113, 0.12)',
                accentLine: 'rgba(248, 113, 113, 0.18)',
                summary: 'Risk conditions remain defensive across the market.',
                note: 'Sentiment is deeply cautious. In these conditions, preserving structure and avoiding emotional decisions matters more than chasing quick reversals.'
            };
        }

        if (value <= 45) {
            return {
                label: 'Fear',
                accent: '#fbbf24',
                accentSoft: 'rgba(251, 191, 36, 0.12)',
                accentLine: 'rgba(251, 191, 36, 0.18)',
                summary: 'Caution is still present, but panic is lower.',
                note: 'The market is selective and reactive. Positioning tends to improve when confirmation comes from trend and liquidity rather than sentiment alone.'
            };
        }

        if (value <= 55) {
            return {
                label: 'Neutral',
                accent: '#a1a1aa',
                accentSoft: 'rgba(161, 161, 170, 0.12)',
                accentLine: 'rgba(161, 161, 170, 0.18)',
                summary: 'Sentiment is balanced with limited directional pressure.',
                note: 'This usually reflects a wait-and-see phase. Neutral sentiment is often most useful when combined with structure, volatility, and volume context.'
            };
        }

        if (value <= 75) {
            return {
                label: 'Greed',
                accent: '#4ade80',
                accentSoft: 'rgba(74, 222, 128, 0.12)',
                accentLine: 'rgba(74, 222, 128, 0.18)',
                summary: 'Risk appetite is improving across the market.',
                note: 'Momentum can remain constructive in this range, but stronger sentiment should still be validated by price continuation and disciplined entries.'
            };
        }

        return {
            label: 'Extreme Greed',
            accent: '#60a5fa',
            accentSoft: 'rgba(96, 165, 250, 0.12)',
            accentLine: 'rgba(96, 165, 250, 0.18)',
            summary: 'Optimism is elevated and sentiment is stretched.',
            note: 'When sentiment reaches extremes, markets can become more vulnerable to sharp reactions. Strong upside does not remove the need for risk control.'
        };
    }, [data.value]);

    const gaugeOffset = useMemo(() => {
        const circumference = 283;
        return circumference - (circumference * Math.max(0, Math.min(100, data.value))) / 100;
    }, [data.value]);

    const sentimentMode = useMemo(() => {
        const value = Math.max(0, Math.min(100, data.value));
        if (value < 35) return 'Defensive';
        if (value < 60) return 'Balanced';
        return 'Risk-On';
    }, [data.value]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fgx-overlay" onClick={onClose}>
            <div
                className="fgx-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    '--fgx-accent': theme.accent,
                    '--fgx-accent-soft': theme.accentSoft,
                    '--fgx-accent-line': theme.accentLine
                }}
            >
                <div className="fgx-header">
                    <div className="fgx-header-copy">
                        <div className="fgx-badge">MARKET SENTIMENT</div>
                        <h2 className="fgx-title">Fear &amp; Greed Index</h2>
                        <p className="fgx-subtitle">
                            Real-time sentiment snapshot derived from current market conditions.
                        </p>
                    </div>

                    <button className="fgx-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="fgx-body custom-scrollbar">
                    <div className="fgx-grid">
                        <section className="fgx-card fgx-gauge-card">
                            <div className="fgx-card-head">
                                <span>Current Reading</span>
                                <span className="fgx-accent-text">{theme.label}</span>
                            </div>

                            <div className="fgx-gauge-wrap">
                                <svg width="260" height="150" viewBox="0 0 240 120">
                                    <path
                                        d="M 30 110 A 90 90 0 0 1 210 110"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.06)"
                                        strokeWidth="14"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M 30 110 A 90 90 0 0 1 210 110"
                                        fill="none"
                                        stroke="var(--fgx-accent)"
                                        strokeWidth="14"
                                        strokeLinecap="round"
                                        strokeDasharray="283"
                                        strokeDashoffset={gaugeOffset}
                                        style={{
                                            transition: 'stroke-dashoffset 0.9s ease, stroke 0.25s ease',
                                            filter: 'drop-shadow(0 0 8px var(--fgx-accent))'
                                        }}
                                    />
                                </svg>

                                <div className="fgx-gauge-center">
                                    <div className="fgx-value">{isLoading ? '--' : data.value}</div>
                                    <div className="fgx-label">{theme.label}</div>
                                </div>
                            </div>

                            <div className="fgx-stats">
                                <div className="fgx-stat">
                                    <span>Mode</span>
                                    <strong>{sentimentMode}</strong>
                                </div>
                                <div className="fgx-stat">
                                    <span>Classification</span>
                                    <strong>{data.classification || theme.label}</strong>
                                </div>
                            </div>
                        </section>

                        <div className="fgx-side">
                            <section className="fgx-card fgx-summary-card">
                                <div className="fgx-card-head">
                                    <span>Interpretation</span>
                                </div>
                                <h3>{theme.summary}</h3>
                                <p>{theme.note}</p>
                            </section>

                            <section className="fgx-card fgx-market-card">
                                <div className="fgx-card-head">
                                    <span>Top Market Movers</span>
                                    <span>{marketData.length} Assets</span>
                                </div>

                                <div className="fgx-market-list">
                                    {marketData.length === 0 ? (
                                        <div className="fgx-empty">
                                            Market data is currently unavailable.
                                        </div>
                                    ) : (
                                        marketData.map((coin) => {
                                            const isPositive = Number(coin.price_change_percentage_24h) >= 0;

                                            return (
                                                <div key={coin.id} className="fgx-coin-row">
                                                    <div className="fgx-coin-left">
                                                        <img
                                                            src={coin.image}
                                                            alt={coin.symbol}
                                                            className="fgx-coin-icon"
                                                        />
                                                        <div className="fgx-coin-copy">
                                                            <div className="fgx-coin-symbol">
                                                                {coin.symbol?.toUpperCase()}
                                                            </div>
                                                            <div className="fgx-coin-name">
                                                                {coin.name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`fgx-coin-change ${
                                                            isPositive ? 'positive' : 'negative'
                                                        }`}
                                                    >
                                                        {isPositive ? '+' : ''}
                                                        {Number(coin.price_change_percentage_24h || 0).toFixed(1)}%
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    <section className="fgx-card fgx-note-card">
                        <div className="fgx-card-head">
                            <span>Strategic Note</span>
                        </div>
                        <p>
                            This indicator works best as a context layer rather than a standalone signal.
                            The highest-quality decisions usually come from combining sentiment with trend,
                            structure, liquidity, and risk management.
                        </p>
                    </section>
                </div>
            </div>

            <style>{`
                .fgx-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1000000;
                    background: rgba(6, 8, 12, 0.72);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .fgx-modal {
                    width: min(960px, 100%);
                    max-height: calc(100vh - 40px);
                    display: flex;
                    flex-direction: column;
                    border-radius: 26px;
                    overflow: hidden;
                    background:
                        linear-gradient(
                            145deg,
                            rgba(18, 20, 26, 0.98) 0%,
                            rgba(12, 14, 19, 0.99) 100%
                        );
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.04),
                        0 28px 80px rgba(0,0,0,0.52);
                    animation: fgxIn 0.25s ease;
                }

                .fgx-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    padding: 22px 22px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    flex-shrink: 0;
                }

                .fgx-header-copy {
                    min-width: 0;
                }

                .fgx-badge {
                    display: inline-flex;
                    align-items: center;
                    height: 26px;
                    padding: 0 10px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: rgba(255,255,255,0.56);
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    margin-bottom: 10px;
                }

                .fgx-title {
                    margin: 0 0 6px 0;
                    color: #ffffff;
                    font-size: 24px;
                    line-height: 1.08;
                    letter-spacing: -0.03em;
                    font-weight: 800;
                }

                .fgx-subtitle {
                    margin: 0;
                    color: rgba(255,255,255,0.58);
                    font-size: 13px;
                    line-height: 1.6;
                    max-width: 620px;
                }

                .fgx-close {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.04);
                    color: rgba(255,255,255,0.72);
                    cursor: pointer;
                    transition: 0.2s ease;
                    flex-shrink: 0;
                }

                .fgx-close:hover {
                    color: #fff;
                    background: rgba(255,255,255,0.08);
                }

                .fgx-body {
                    padding: 18px 22px 22px;
                    overflow-y: auto;
                    min-height: 0;
                }

                .fgx-grid {
                    display: grid;
                    grid-template-columns: 1.1fr 0.9fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .fgx-side {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .fgx-card {
                    border-radius: 22px;
                    background:
                        linear-gradient(
                            145deg,
                            rgba(255,255,255,0.04) 0%,
                            rgba(255,255,255,0.018) 100%
                        );
                    border: 1px solid rgba(255,255,255,0.06);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
                }

                .fgx-card-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 14px;
                    color: rgba(255,255,255,0.56);
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                }

                .fgx-accent-text {
                    color: var(--fgx-accent);
                }

                .fgx-gauge-card {
                    padding: 18px;
                }

                .fgx-gauge-wrap {
                    position: relative;
                    min-height: 205px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .fgx-gauge-center {
                   position: absolute;
    top: 72px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
                }

                .fgx-value {
                 font-size: 50px;
    line-height: 0.95;
    font-weight: 650;
    letter-spacing: -0.05em;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
                }

                .fgx-label {
                    margin-top: 10px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--fgx-accent);
    opacity: 0.9;
                }

                .fgx-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-top: 8px;
                }

                .fgx-stat {
                    padding: 13px 14px;
                    border-radius: 16px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .fgx-stat span {
                    display: block;
                    margin-bottom: 6px;
                    color: rgba(255,255,255,0.5);
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                .fgx-stat strong {
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 700;
                }

                .fgx-summary-card {
                    padding: 18px;
                    border-left: 3px solid var(--fgx-accent-line);
                }

                .fgx-summary-card h3 {
                    margin: 0 0 10px 0;
                    color: #ffffff;
                    font-size: 22px;
                    line-height: 1.25;
                    font-weight: 800;
                    letter-spacing: -0.03em;
                }

                .fgx-summary-card p {
                    margin: 0;
                    color: rgba(255,255,255,0.62);
                    font-size: 13px;
                    line-height: 1.7;
                }

                .fgx-market-card {
                    padding: 18px;
                }

                .fgx-market-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .fgx-empty {
                    padding: 14px;
                    border-radius: 16px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    color: rgba(255,255,255,0.52);
                    font-size: 13px;
                    text-align: center;
                }

                .fgx-coin-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    padding: 11px 13px;
                    border-radius: 16px;
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.045);
                }

                .fgx-coin-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .fgx-coin-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }

                .fgx-coin-copy {
                    min-width: 0;
                }

                .fgx-coin-symbol {
                    color: #fff;
                    font-size: 13px;
                    font-weight: 700;
                    line-height: 1.2;
                }

                .fgx-coin-name {
                    color: rgba(255,255,255,0.44);
                    font-size: 11px;
                    line-height: 1.2;
                    margin-top: 2px;
                }

                .fgx-coin-change {
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .fgx-coin-change.positive {
                    color: #4ade80;
                }

                .fgx-coin-change.negative {
                    color: #f87171;
                }

                .fgx-note-card {
                    padding: 18px;
                }

                .fgx-note-card p {
                    margin: 0;
                    color: rgba(255,255,255,0.62);
                    font-size: 13px;
                    line-height: 1.75;
                }

                @keyframes fgxIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.99);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.12);
                    border-radius: 10px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.18);
                }

                @media (max-width: 900px) {
                    .fgx-modal {
                        width: 100%;
                    }

                    .fgx-grid {
                        grid-template-columns: 1fr;
                    }

                    .fgx-summary-card h3 {
                        font-size: 20px;
                    }
                }

                @media (max-width: 640px) {
                    .fgx-overlay {
                        padding: 12px;
                    }

                    .fgx-modal {
                        max-height: calc(100vh - 24px);
                        border-radius: 20px;
                    }

                    .fgx-header {
                        padding: 18px 16px 14px;
                    }

                    .fgx-body {
                        padding: 14px 16px 16px;
                    }

                    .fgx-title {
                        font-size: 21px;
                    }

                    .fgx-subtitle {
                        font-size: 12px;
                    }

                    .fgx-gauge-card,
                    .fgx-summary-card,
                    .fgx-market-card,
                    .fgx-note-card {
                        border-radius: 18px;
                    }

                    .fgx-gauge-wrap {
                        min-height: 185px;
                    }

                    .fgx-gauge-center {
                        top: 70px;
                    }

                    .fgx-value {
                        font-size: 42px;
                    }

                    .fgx-stats {
                        grid-template-columns: 1fr;
                    }

                    .fgx-summary-card h3 {
                        font-size: 18px;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default FearGreedIndex;