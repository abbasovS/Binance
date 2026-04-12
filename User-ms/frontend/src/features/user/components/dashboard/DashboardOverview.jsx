import React from 'react';
import ArenaNewsBoard from '../../../trade/components/ArenaNewsBoard';

const DashboardOverview = ({
                               watchlist = [],
                               alerts = [],
                               prices = {},
                               openPositions: rawOpenPositions = [],
                               setExpandedCoin,
                               expandedCoin,
                               setIsPortfolioOpen,
                               setIsAlertModalOpen,
                               setIsTelegramModalOpen,
                               handleTournamentAccess,
                               handleProAnalysis,
                               refetchAlerts,
                               setSearchTerm,
                           }) => {
    const combinedSymbols = Array.from(
        new Set([
            ...(watchlist || []).slice().reverse().map((item) => item?.symbol),
            ...(alerts || []).slice().reverse().map((item) => item?.symbol),
            ...(rawOpenPositions || []).slice().reverse().map((item) => item?.symbol),
        ])
    ).filter(Boolean);

    const openPositions = (rawOpenPositions || []).filter(
        (trade) => trade && trade.symbol
    );

    const formatNumber = (num, fallback = '---', min = 2, max = 2) => {
        const parsed = parseFloat(num);
        if (num === null || num === undefined || num === '' || isNaN(parsed)) {
            return fallback;
        }

        return parsed.toLocaleString('en-US', {
            minimumFractionDigits: min,
            maximumFractionDigits: max,
        });
    };

    return (
        <div className="dashboard-main">
            <div className="dashboard-overview">
                <div className="overview-grid">
                    <section className="hero-card">
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: '16px',
                                width: '100%',
                            }}
                        >
                            <div className="hero-card__text-content">
                                <div className="hero-card__eyebrow">Workspace Overview</div>
                                <h2 className="hero-card__title">Dashboard</h2>
                                <p className="hero-card__subtitle">
                                    Track your assets, analyze the market, and stay ahead.
                                </p>
                            </div>

                            <div className="hero-card__actions">
                                <button
                                    className="hero-card__secondaryBtn"
                                    onClick={() => {
                                        setIsAlertModalOpen(false);
                                        setIsTelegramModalOpen(false);
                                        setIsPortfolioOpen(true);
                                    }}
                                >
                                    Portfolio
                                </button>

                                <button
                                    className="hero-card__secondaryBtn"
                                    onClick={() => {
                                        setIsPortfolioOpen(false);
                                        setIsTelegramModalOpen(false);
                                        refetchAlerts();
                                        setIsAlertModalOpen(true);
                                    }}
                                >
                                    Alerts
                                </button>

                                <button
                                    className="hero-card__secondaryBtn"
                                    onClick={() => {
                                        setIsPortfolioOpen(false);
                                        setIsAlertModalOpen(false);
                                        setIsTelegramModalOpen(true);
                                    }}
                                >
                                    Telegram
                                </button>
                            </div>
                        </div>

                        {combinedSymbols.length > 0 && (
                            <div
                                className="dashboard-tracked-grid hide-scrollbar"
                                style={{
                                    marginTop: '16px',
                                    paddingTop: '24px',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    maxHeight: '380px',
                                    overflowY: 'auto',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                    gap: '16px',
                                    alignContent: 'flex-start',
                                }}
                            >
                                {combinedSymbols.map((sym, index) => {
                                    const upperSym = sym.toUpperCase();
                                    const cleanLogoSym = upperSym
                                        .replace('USDT', '')
                                        .toLowerCase()
                                        .trim();
                                    const symWithUsdt = upperSym.endsWith('USDT')
                                        ? upperSym
                                        : `${upperSym}USDT`;
                                    const pureSym = upperSym.replace('USDT', '');

                                    const inPortfolio = (watchlist || []).some(
                                        (w) => w.symbol.toUpperCase() === upperSym
                                    );
                                    const coinAlerts = (alerts || []).filter(
                                        (a) => a.symbol.toUpperCase() === upperSym
                                    );

                                    const data = prices
                                        ? prices[upperSym] ||
                                        prices[symWithUsdt] ||
                                        prices[pureSym]
                                        : null;

                                    const currentPrice = data ? data.price || data.c : null;
                                    const change = data ? data.change || data.P : null;
                                    const high = data ? data.high || data.h : null;
                                    const low = data ? data.low || data.l : null;
                                    const volume = data ? data.volume || data.q : null;
                                    const priceChangeAmt = data
                                        ? data.priceChangeAmt || data.priceChange || data.p
                                        : null;
                                    const baseVolume = data ? data.baseVolume || data.v : null;
                                    const vwap = data ? data.vwap || data.w : null;

                                    const parsedChange = parseFloat(change);
                                    const isPositive = !isNaN(parsedChange)
                                        ? parsedChange >= 0
                                        : true;

                                    const color = isPositive ? '#02c076' : '#f84960';

                                    const formatCardNumber = (num) => {
                                        if (
                                            num === null ||
                                            num === undefined ||
                                            num === '' ||
                                            isNaN(parseFloat(num))
                                        ) {
                                            return '---.--';
                                        }

                                        const parsed = parseFloat(num);

                                        return parsed.toLocaleString('en-US', {
                                            minimumFractionDigits: parsed < 1 ? 4 : 2,
                                            maximumFractionDigits: parsed < 1 ? 6 : 2,
                                        });
                                    };

                                    return (
                                        <div
                                            key={sym || index}
                                            className={`dashboard-tracked-item ${
                                                isPositive ? 'positive' : 'negative'
                                            }`}
                                            onClick={() =>
                                                setExpandedCoin({
                                                    sym: upperSym,
                                                    pureSym,
                                                    cleanLogoSym,
                                                    currentPrice,
                                                    change,
                                                    high,
                                                    low,
                                                    volume,
                                                    baseVolume,
                                                    priceChangeAmt,
                                                    vwap,
                                                    color,
                                                })
                                            }
                                        >
                                            <div className="tracked-card__header">
                                                <div className="tracked-card__asset">
                                                    <div className="tracked-card__logo">
                                                        <span className="tracked-card__logoFallback">
                                                            {cleanLogoSym
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </span>
                                                        <img
                                                            src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanLogoSym}.png`}
                                                            onError={(e) => {
                                                                e.target.style.opacity = '0';
                                                            }}
                                                            alt={upperSym}
                                                            className="tracked-card__logoImg"
                                                        />
                                                    </div>

                                                    <div className="tracked-card__assetText">
                                                        <div className="coin-symbol">
                                                            {upperSym}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="tracked-card__badges">
                                                    {inPortfolio && (
                                                        <div
                                                            title="Vault"
                                                            className="tracked-card__badge tracked-card__badge--portfolio"
                                                        >
                                                            💼
                                                        </div>
                                                    )}

                                                    {coinAlerts.length > 0 && (
                                                        <div
                                                            title="Alert active"
                                                            className="tracked-card__badge tracked-card__badge--alert"
                                                        >
                                                            🔔
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="tracked-card__priceBlock">
                                                <div className="tracked-card__labelRow">
                                                    <span className="coin-label">
                                                        MARKET PRICE
                                                    </span>

                                                    {currentPrice && (
                                                        <div
                                                            className="tracked-card__pulseDot"
                                                            style={{
                                                                background: color,
                                                                boxShadow: `0 0 6px ${color}`,
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                <div className="tracked-card__priceRow">
                                                    <div className="coin-price">
                                                        ${formatCardNumber(currentPrice)}
                                                    </div>

                                                    <div
                                                        className="tracked-card__change"
                                                        style={{ color }}
                                                    >
                                                        {isPositive ? '▲' : '▼'}{' '}
                                                        {change &&
                                                        !isNaN(parseFloat(change))
                                                            ? Math.abs(
                                                                parseFloat(change)
                                                            ).toFixed(2)
                                                            : '0.00'}
                                                        %
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="tracked-card__meta">
                                                <div>
                                                    <div className="coin-meta-label">
                                                        24H HIGH
                                                    </div>
                                                    <div className="coin-meta-value">
                                                        ${formatCardNumber(high)}
                                                    </div>
                                                </div>

                                                <div className="tracked-card__metaRight">
                                                    <div className="coin-meta-label">
                                                        24H LOW
                                                    </div>
                                                    <div className="coin-meta-value">
                                                        ${formatCardNumber(low)}
                                                    </div>
                                                </div>
                                            </div>

                                            <svg
                                                viewBox="0 0 100 30"
                                                className="tracked-card__wave"
                                                preserveAspectRatio="none"
                                            >
                                                <path
                                                    d={
                                                        isPositive
                                                            ? 'M0,25 Q25,15 50,20 T100,5'
                                                            : 'M0,5 Q25,15 50,10 T100,25'
                                                    }
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <div className="side-cards">
                        <div className="mini-card tournament-card">
                            <div className="mini-card__top">
                                <span>Paper Tournament</span>
                                <div className="mini-card__badge">Beta</div>
                            </div>

                            <div className="tournament-card__content">
                                <div className="tournament-card__icon">🏆</div>
                                <div className="tournament-card__text">
                                    <h3>Arena</h3>
                                    <p>Practice strategies in paper trading.</p>
                                </div>
                            </div>

                            <button
                                className="tournament-card__button"
                                onClick={handleTournamentAccess}
                            >
                                Open Module
                            </button>
                        </div>

                        <div className="mini-card news-card">
                            <div className="mini-card__top">
                                <span>Market News</span>
                                <div className="mini-card__dot"></div>
                            </div>

                            <div className="news-card__body">
                                <ArenaNewsBoard compact={true} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ======================================================= */}
                {/* AÇIQ POZİSİYALAR CƏDVƏLİ (Yenilənmiş)                   */}
                {/* ======================================================= */}
                <section className="table-card">
                    <div className="table-card__header">
                        <div>
                            <div className="table-card__eyebrow">Live Market</div>
                            <h3>Active Positions</h3>
                        </div>
                    </div>

                    {/* 4 pozisiyadan çox olduqda scroll çıxması üçün max-height və overflow əlavə edildi */}
                    <div
                        className="table-list custom-scrollbar"
                        style={{
                            maxHeight: '320px',
                            overflowY: 'auto',
                            paddingRight: '4px' // Scrollbar ilə kartlar arasında məsafə üçün
                        }}
                    >
                        {(!openPositions || openPositions.length === 0) ? (
                            <div className="dashboard-empty-state">
                                No open positions yet. Switch to Trade terminal to start.
                            </div>
                        ) : (
                            openPositions.map((trade) => {
                                const upperSym = (trade.symbol || '').toUpperCase();
                                const pureSym = upperSym.replace('USDT', '');
                                const cleanLogoSym = pureSym.toLowerCase().trim();

                                const color = parseFloat(trade.pnl || 0) >= 0 ? '#02c076' : '#f84960';

                                return (
                                    <div
                                        key={trade.id}
                                        className="table-row-card"
                                        /* onClick silindi ki, dashboard kartlarındakı mentiq burada işlemesin */
                                        style={{ cursor: 'default' }} // Kliklənə bilməyəcəyini göstərmək üçün
                                    >
                                        <div className="table-row-card__left">
                                            <div className="coin-avatar" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }}>
                                                <img
                                                    src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanLogoSym}.png`}
                                                    alt={upperSym}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                                />
                                            </div>
                                            <div>
                                                <div className="coin-symbol">{upperSym}</div>
                                                <div className="coin-subtext">{trade.side} · Isolated</div>
                                            </div>
                                        </div>

                                        <div className="table-row-card__middle">
                                            <div className="coin-price">${formatNumber(trade.entryPrice)}</div>
                                            <div className="coin-subtext">Margin: ${formatNumber(trade.margin)} ({trade.leverage}x)</div>
                                        </div>

                                        <div className="table-row-card__right">
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="coin-subtext">Unrealized PnL</div>
                                                <div className="coin-change" style={{ color }}>
                                                    {parseFloat(trade.pnl || 0) > 0 ? '+' : ''}{formatNumber(trade.pnl)} USDT
                                                </div>
                                                <div className="coin-subtext" style={{ color }}>
                                                    ({formatNumber(trade.pnlPercentage, '---', 2, 2)}%)
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            {expandedCoin && (() => {
                const liveData =
                    prices[expandedCoin.sym] || prices[expandedCoin.pureSym] || {};

                const c = parseFloat(liveData.price || expandedCoin.currentPrice);
                const h = parseFloat(liveData.high || expandedCoin.high);
                const l = parseFloat(liveData.low || expandedCoin.low);
                const vwap = parseFloat(liveData.vwap || expandedCoin.vwap);
                const priceChangeAmt =
                    liveData.priceChangeAmt || expandedCoin.priceChangeAmt;
                const change = liveData.change || expandedCoin.change;
                const baseVolume = liveData.baseVolume || expandedCoin.baseVolume;
                const volume = liveData.volume || expandedCoin.volume;

                const pressure =
                    h && l && h !== l
                        ? Math.min(Math.max(((c - l) / (h - l)) * 100, 0), 100)
                        : 50;

                const isAboveVwap = vwap ? c >= vwap : true;

                return (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(7, 10, 20, 0.72)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            zIndex: 9999,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '24px',
                        }}
                        onClick={() => setExpandedCoin(null)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '620px',
                                background: `
                                    linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%),
                                    linear-gradient(135deg, rgba(29, 36, 61, 0.96) 0%, rgba(17, 22, 39, 0.98) 55%, rgba(12, 16, 28, 1) 100%)
                                `,
                                borderRadius: '24px',
                                border: `1px solid ${expandedCoin.color}33`,
                                boxShadow:
                                    '0 30px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.08)',
                                padding: '30px',
                                animation: 'flipInExpand 0.35s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '22px',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '-70px',
                                    right: '-70px',
                                    width: '180px',
                                    height: '180px',
                                    borderRadius: '50%',
                                    background: expandedCoin.color,
                                    filter: 'blur(70px)',
                                    opacity: 0.12,
                                    pointerEvents: 'none',
                                }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            position: 'relative',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.18)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                color: '#b7c0d4',
                                                fontSize: '13px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {expandedCoin.cleanLogoSym
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </span>

                                        <img
                                            src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${expandedCoin.cleanLogoSym}.png`}
                                            onError={(e) => {
                                                e.target.style.opacity = '0';
                                            }}
                                            alt={expandedCoin.sym}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                zIndex: 2,
                                                position: 'relative',
                                                transition: 'opacity 0.2s',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: '8px',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <h2
                                                style={{
                                                    margin: 0,
                                                    color: '#f8fbff',
                                                    fontSize: '24px',
                                                    fontWeight: '800',
                                                    letterSpacing: '-0.5px',
                                                }}
                                            >
                                                {expandedCoin.sym}
                                            </h2>

                                            <span
                                                style={{
                                                    color: expandedCoin.color,
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                }}
                                            >
                                                {change && !isNaN(parseFloat(change))
                                                    ? `${parseFloat(change) >= 0 ? '+' : ''}${parseFloat(change).toFixed(2)}%`
                                                    : '0.00%'}
                                            </span>
                                        </div>

                                        <span
                                            style={{
                                                color: '#8ea0c3',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.7px',
                                            }}
                                        >
                                            Asset Deep-Dive Terminal
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setExpandedCoin(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#aab6cf',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: '0.2s ease',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.background =
                                            'rgba(255,255,255,0.10)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.color = '#aab6cf';
                                        e.currentTarget.style.background =
                                            'rgba(255,255,255,0.06)';
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    padding: '20px',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                            >
                                <div style={{ marginBottom: '20px' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: '#8a97b3',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.6px',
                                            }}
                                        >
                                            Intraday Buy Pressure
                                        </span>

                                        <span
                                            style={{
                                                color:
                                                    pressure >= 50
                                                        ? '#02c076'
                                                        : '#f84960',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                            }}
                                        >
                                            {pressure.toFixed(1)}%
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            width: '100%',
                                            height: '6px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '999px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                height: '100%',
                                                width: `${pressure}%`,
                                                background:
                                                    'linear-gradient(90deg, #f84960 0%, #02c076 100%)',
                                                borderRadius: '999px',
                                                opacity: 0.9,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '16px',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        paddingTop: '16px',
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                color: '#8a97b3',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                marginBottom: '4px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            VWAP (Trend Baseline)
                                        </div>

                                        <div
                                            style={{
                                                color: '#eef4ff',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            $
                                            {vwap
                                                ? vwap.toLocaleString('en-US', {
                                                    maximumFractionDigits: 4,
                                                })
                                                : '---'}

                                            <span
                                                style={{
                                                    fontSize: '9px',
                                                    padding: '3px 6px',
                                                    borderRadius: '999px',
                                                    background: isAboveVwap
                                                        ? 'rgba(2,192,118,0.1)'
                                                        : 'rgba(248,73,96,0.1)',
                                                    color: isAboveVwap
                                                        ? '#02c076'
                                                        : '#f84960',
                                                    border: `1px solid ${
                                                        isAboveVwap
                                                            ? 'rgba(2,192,118,0.2)'
                                                            : 'rgba(248,73,96,0.2)'
                                                    }`,
                                                }}
                                            >
                                                {isAboveVwap ? 'ABOVE' : 'BELOW'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                color: '#8a97b3',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                marginBottom: '4px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Net Change ($)
                                        </div>

                                        <div
                                            style={{
                                                color:
                                                    priceChangeAmt &&
                                                    parseFloat(priceChangeAmt) >= 0
                                                        ? '#02c076'
                                                        : '#f84960',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                            }}
                                        >
                                            {priceChangeAmt
                                                ? (parseFloat(priceChangeAmt) > 0
                                                    ? '+'
                                                    : '') +
                                                parseFloat(
                                                    priceChangeAmt
                                                ).toLocaleString()
                                                : '---'}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            borderTop:
                                                '1px solid rgba(255,255,255,0.06)',
                                            paddingTop: '12px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: '#8a97b3',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                marginBottom: '4px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Base Vol ({expandedCoin.pureSym})
                                        </div>

                                        <div
                                            style={{
                                                color: '#f8fbff',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                            }}
                                        >
                                            {baseVolume
                                                ? parseFloat(baseVolume).toLocaleString(
                                                    'en-US',
                                                    {
                                                        maximumFractionDigits: 0,
                                                    }
                                                )
                                                : '---'}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            borderTop:
                                                '1px solid rgba(255,255,255,0.06)',
                                            paddingTop: '12px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: '#8a97b3',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                marginBottom: '4px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Turnover (USDT)
                                        </div>

                                        <div
                                            style={{
                                                color: '#f8fbff',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                            }}
                                        >
                                            {volume
                                                ? '$' +
                                                (parseFloat(volume) / 1e6).toFixed(2) +
                                                'M'
                                                : '---'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const symForAnalysis = expandedCoin.pureSym;
                                    if (setSearchTerm) setSearchTerm(symForAnalysis);
                                    setExpandedCoin(null);
                                    setTimeout(() => handleProAnalysis(symForAnalysis), 50);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    color: '#8fc2ff',
                                    border: '1px solid rgba(59, 130, 246, 0.28)',
                                    borderRadius: '14px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background =
                                        'rgba(59, 130, 246, 0.14)';
                                    e.currentTarget.style.boxShadow =
                                        '0 0 20px rgba(59, 130, 246, 0.18)';
                                    e.currentTarget.style.transform =
                                        'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background =
                                        'rgba(59, 130, 246, 0.08)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform =
                                        'translateY(0)';
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                EXECUTE DEEP ANALYSIS
                            </button>
                        </div>
                    </div>
                );
            })()}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }

                @keyframes flipInExpand {
                    0% {
                        opacity: 0;
                        transform: perspective(400px) rotateX(10deg) scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: perspective(400px) rotateX(0deg) scale(1);
                    }
                }

                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default DashboardOverview;