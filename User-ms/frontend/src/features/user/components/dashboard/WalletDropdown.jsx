import React, { useEffect, useMemo, useRef, useState } from 'react';
import useWalletSummary from './useWalletSummary';
import './wallet.css';

const formatMoney = (value, withSign = true) => {
    const num = Number(value || 0);
    const sign = withSign ? (num >= 0 ? '+' : '-') : '';
    return `${sign}${Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} USDT`;
};

const formatPlainMoney = (value) => {
    const num = Number(value || 0);
    return `${num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} USDT`;
};

const formatPercent = (value) => {
    const num = Number(value || 0);
    return `${num.toFixed(1)}%`;
};

const formatUpdatedAt = (value) => {
    if (!value) return 'Not synced yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently updated';
    return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getPnlClass = (value) => {
    const num = Number(value || 0);
    if (num > 0) return 'is-positive';
    if (num < 0) return 'is-negative';
    return 'is-neutral';
};

const WalletDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedDayKey, setSelectedDayKey] = useState('');
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    const {
        loading,
        error,
        summary,
        refetch,
    } = useWalletSummary();

    useEffect(() => {
        if (!isOpen) return;
        refetch();
    }, [isOpen, refetch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsCalendarOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                if (isCalendarOpen) {
                    setIsCalendarOpen(false);
                    return;
                }

                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isCalendarOpen]);

    useEffect(() => {
        const firstOpenDay = summary.calendar?.days?.find(
            (day) => !day.isPlaceholder && !day.isLocked
        );

        if (!selectedDayKey && firstOpenDay) {
            setSelectedDayKey(firstOpenDay.key);
        }
    }, [summary.calendar, selectedDayKey]);

    const selectedDay = useMemo(() => {
        return summary.calendar?.days?.find(
            (day) => !day.isPlaceholder && day.key === selectedDayKey
        ) || null;
    }, [summary.calendar, selectedDayKey]);

    const winRateWidth = useMemo(() => {
        const rate = Number(summary.winRate || 0);
        return `${Math.max(0, Math.min(100, rate))}%`;
    }, [summary.winRate]);

    const handleWalletToggle = () => {
        setIsOpen((prev) => {
            const next = !prev;
            if (!next) setIsCalendarOpen(false);
            return next;
        });
    };

    const handleCalendarToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsCalendarOpen((prev) => !prev);
    };

    const handleRefresh = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        await refetch();
    };

    return (
        <div className="wallet-dropdown" ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                className={`dashboard-topbar__iconBtn wallet-topbar-icon ${isOpen ? 'is-open' : ''}`}
                onClick={handleWalletToggle}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Open wallet"
                title="Wallet"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M2 10H22" stroke="currentColor" strokeWidth="2" />
                    <circle cx="17" cy="14.5" r="1" fill="currentColor" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="wallet-dropdown__panel" role="dialog" aria-label="Wallet summary">
                        <div className="wallet-dropdown__header">
                            <div>
                                <div className="wallet-dropdown__eyebrow">Account Wallet</div>
                                <h3 className="wallet-dropdown__title">Portfolio Overview</h3>
                                <div className="wallet-dropdown__updated">
                                    {error ? error : formatUpdatedAt(summary.updatedAt)}
                                </div>
                            </div>

                            <div className="wallet-dropdown__actions">
                                <button
                                    type="button"
                                    className={`wallet-dropdown__iconAction ${isCalendarOpen ? 'is-active' : ''}`}
                                    onClick={handleCalendarToggle}
                                    title="Open calendar"
                                    aria-label="Open trading calendar"
                                    aria-expanded={isCalendarOpen}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                                        <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    className={`wallet-dropdown__iconAction ${loading ? 'is-spinning' : ''}`}
                                    onClick={handleRefresh}
                                    title="Refresh wallet"
                                    aria-label="Refresh wallet"
                                    aria-busy={loading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M20 11A8 8 0 1 0 8.5 19.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M20 4V11H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="wallet-dropdown__hero">
                            <div className="wallet-dropdown__heroLabel">Total Balance</div>
                            <div className="wallet-dropdown__heroValue">
                                {formatPlainMoney(summary.balance)}
                            </div>

                            <div className="wallet-dropdown__heroSubgrid">
                                <div className="wallet-dropdown__heroMetaCard">
                                    <span>Withdrawable</span>
                                    <strong>{formatPlainMoney(summary.withdrawable)}</strong>
                                </div>

                                <div className="wallet-dropdown__heroMetaCard">
                                    <span>Open PnL</span>
                                    <strong className={getPnlClass(summary.openPnl)}>
                                        {formatMoney(summary.openPnl)}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div className="wallet-dropdown__section">
                            <div className="wallet-dropdown__sectionTitle">Performance Snapshot</div>

                            <div className="wallet-dropdown__grid">
                                <div className="wallet-stat-card">
                                    <span className="wallet-stat-card__label">Realized PnL</span>
                                    <strong className={getPnlClass(summary.totalRealizedPnl)}>
                                        {formatMoney(summary.totalRealizedPnl)}
                                    </strong>
                                </div>

                                <div className="wallet-stat-card">
                                    <span className="wallet-stat-card__label">This Week</span>
                                    <strong className={getPnlClass(summary.weeklyPnl)}>
                                        {formatMoney(summary.weeklyPnl)}
                                    </strong>
                                </div>

                                <div className="wallet-stat-card">
                                    <span className="wallet-stat-card__label">This Month</span>
                                    <strong className={getPnlClass(summary.monthlyPnl)}>
                                        {formatMoney(summary.monthlyPnl)}
                                    </strong>
                                </div>

                                <div className="wallet-stat-card">
                                    <span className="wallet-stat-card__label">Used Exposure</span>
                                    <strong>{formatPlainMoney(summary.usedExposure)}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="wallet-dropdown__section">
                            <div className="wallet-dropdown__progressHead">
                                <span className="wallet-dropdown__sectionTitle">Win Rate</span>
                                <strong>{formatPercent(summary.winRate)}</strong>
                            </div>

                            <div className="wallet-dropdown__progress">
                                <div
                                    className="wallet-dropdown__progressFill"
                                    style={{ width: winRateWidth }}
                                />
                            </div>
                        </div>

                        <div className="wallet-dropdown__footer">
                            <div className="wallet-chip">
                                Active <strong>{summary.activeTradesCount}</strong>
                            </div>
                            <div className="wallet-chip">
                                Pending <strong>{summary.pendingTradesCount}</strong>
                            </div>
                            <div className="wallet-chip">
                                Closed <strong>{summary.totalTrades}</strong>
                            </div>
                        </div>
                    </div>

                    {isCalendarOpen && (
                        <div className="wallet-calendar-panel">
                            <div className="wallet-calendar-panel__header">
                                <div>
                                    <div className="wallet-dropdown__eyebrow">Trading Window</div>
                                    <div className="wallet-calendar-panel__title">
                                        {summary.calendar?.monthLabel}
                                    </div>
                                </div>
                            </div>

                            <div className="wallet-calendar__legend">
                                <span><i className="wallet-dot wallet-dot--open" /> Open</span>
                                <span><i className="wallet-dot wallet-dot--locked" /> Locked</span>
                                <span><i className="wallet-dot wallet-dot--profit" /> Profit</span>
                                <span><i className="wallet-dot wallet-dot--loss" /> Loss</span>
                            </div>

                            <div className="wallet-calendar__weekdays">
                                <span>Mo</span>
                                <span>Tu</span>
                                <span>We</span>
                                <span>Th</span>
                                <span>Fr</span>
                                <span>Sa</span>
                                <span>Su</span>
                            </div>

                            <div className="wallet-calendar">
                                {summary.calendar?.days?.map((day) => {
                                    if (day.isPlaceholder) {
                                        return <div key={day.key} className="wallet-calendar__placeholder" />;
                                    }

                                    const pnlClass =
                                        day.pnl > 0 ? 'has-profit' :
                                            day.pnl < 0 ? 'has-loss' :
                                                '';

                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            className={[
                                                'wallet-calendar__day',
                                                day.isLocked ? 'is-locked' : 'is-open',
                                                day.isToday ? 'is-today' : '',
                                                selectedDayKey === day.key ? 'is-selected' : '',
                                                day.isRangeStart ? 'is-range-start' : '',
                                                day.isRangeEnd ? 'is-range-end' : '',
                                                pnlClass,
                                            ].join(' ').trim()}
                                            onClick={() => setSelectedDayKey(day.key)}
                                            title={`${day.day} • ${day.reason}`}
                                        >
                                            <span className="wallet-calendar__dayNumber">{day.day}</span>

                                            {!day.isLocked && day.pnl !== 0 && (
                                                <span
                                                    className={`wallet-calendar__pnlBadge ${day.pnl > 0 ? 'is-positive' : 'is-negative'}`}
                                                >
                                                    {day.pnl > 0 ? '+' : '-'}{Math.abs(day.pnl).toFixed(0)}
                                                </span>
                                            )}

                                            {day.isLocked && (
                                                <span className="wallet-calendar__lock">●</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedDay && (
                                <div className="wallet-calendar__detail">
                                    <div className="wallet-calendar__detailTop">
                                        <strong>
                                            {summary.calendar?.monthLabel?.split(' ')[0]} {selectedDay.day}
                                        </strong>
                                        <span className={selectedDay.isLocked ? 'is-locked-text' : 'is-open-text'}>
                                            {selectedDay.reason}
                                        </span>
                                    </div>

                                    <div className="wallet-calendar__detailRow">
                                        <span>Daily PnL</span>
                                        <strong className={getPnlClass(selectedDay.pnl)}>
                                            {selectedDay.tradesCount > 0
                                                ? formatMoney(selectedDay.pnl)
                                                : 'No trades'}
                                        </strong>
                                    </div>

                                    <div className="wallet-calendar__detailRow">
                                        <span>Trades</span>
                                        <strong>{selectedDay.tradesCount}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WalletDropdown;