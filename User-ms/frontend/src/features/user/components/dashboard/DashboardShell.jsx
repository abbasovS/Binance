import React from 'react';
import FearGreedIndex from '../FearGreedIndex';
import AnalysisModal from '../AnalysisModal';
import * as ST from '../UserStyles';
import { LiquidityMapModal, WhaleRadarModal } from '../HeatMapAndWhaleRadar';
import DashboardTopbar from './DashboardTopbar';
import DashboardSidebar from './DashboardSidebar';
import DashboardOverview from './DashboardOverview';
import TickerBar  from "../TickerBar";
import './dashboard.css';
import NotificationDrawer from './NotificationDrawer';

const DashboardShell = ({
                            isAdmin,
                            navigate,
                            handleLogout,
                            setIsSearchOpen,
                            setIsSentimentOpen,
                            setIsLiquidityOpen,
                            setIsWhaleRadarOpen,
                            handleTournamentAccess,
                            watchlist,
                            alerts,
                            prices,
                            setExpandedCoin,
                            expandedCoin,
                            setIsPortfolioOpen,
                            setIsAlertModalOpen,
                            setIsTelegramModalOpen,
                            handleProAnalysis,
                            refetchAlerts,
                            isSearchOpen,
                            searchTerm,
                            setSearchTerm,
                            isModalOpen,
                            setIsModalOpen,
                            chartBase64,
                            symbol,
                            isSentimentOpen,
                            isLiquidityOpen,
                            isWhaleRadarOpen,
                            isPortfolioOpen,
                            portfolioInput,
                            setPortfolioInput,
                            addToWatchlist,
                            removeFromWatchlist,
                            isTelegramModalOpen,
                            telegramStatus,
                            handleTelegramDisconnect,
                            initTelegramConnection,
                            confirmTelegramConnection,
                            isAlertModalOpen,
                            alertInput,
                            setAlertInput,
                            addAlert,
                            handleDeleteClick,
                            deleteTarget,
                            setDeleteTarget,
                            openPositions = [],
                            confirmDelete,
                            systemMessage,
                            closeSystemMessage,
                            notificationDrawerOpen,
                            setNotificationDrawerOpen,
                            notifications,
                            notificationUnreadCount,
                            notificationLoading,
                            handleMarkNotificationRead,
                            handleMarkAllNotificationsRead,
                        }) => {



    const closeAllDrawers = () => {
        setIsPortfolioOpen(false);
        setIsTelegramModalOpen(false);
        setIsAlertModalOpen(false);

        setDeleteTarget?.(null);
    };
    return (
        <div className="dashboard-shell">
            <div className="dashboard-frame">
                <DashboardSidebar
                    handleTournamentAccess={handleTournamentAccess}
                    setIsSearchOpen={setIsSearchOpen}
                    setIsSentimentOpen={setIsSentimentOpen}
                    setIsLiquidityOpen={setIsLiquidityOpen}
                    setIsWhaleRadarOpen={setIsWhaleRadarOpen}
                />

                <div className="dashboard-content-area">
                    <DashboardTopbar
                        isAdmin={isAdmin}
                        navigate={navigate}
                        handleLogout={handleLogout}
                        unreadCount={notificationUnreadCount}
                        onOpenNotifications={() => setNotificationDrawerOpen(true)}

                    />

                    <div style={{marginBottom: '24px'}}>
                        <TickerBar onCoinClick={(coin) => console.log(coin, 'klikləndi!')}/>
                    </div>

                    <DashboardOverview
                        watchlist={watchlist}
                        alerts={alerts}
                        openPositions={openPositions}
                        prices={prices}
                        setExpandedCoin={setExpandedCoin}
                        expandedCoin={expandedCoin}
                        setIsPortfolioOpen={setIsPortfolioOpen}
                        setIsAlertModalOpen={setIsAlertModalOpen}
                        setIsTelegramModalOpen={setIsTelegramModalOpen}
                        handleTournamentAccess={handleTournamentAccess}
                        handleProAnalysis={handleProAnalysis}
                        refetchAlerts={refetchAlerts}
                        setSearchTerm={setSearchTerm}
                    />
                </div>
            </div>

            {isSearchOpen && (
                <div style={ST.refinedOverlayStyle}>
                    <div className="fade-in" style={ST.refinedBoxStyle}>
                        <h3 style={ST.refinedTitleStyle}>CRYPTO INTELLIGENCE</h3>
                        <input
                            autoFocus
                            className="premium-input"
                            placeholder="BTC, ETH, SOL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleProAnalysis()}
                            style={ST.refinedInputStyle}
                        />
                        <div style={{display: 'flex', gap: '12px', marginTop: '25px'}}>
                            <button onClick={() => handleProAnalysis()} style={ST.proConfirmBtn}>
                                START ANALYSIS
                            </button>
                            <button onClick={() => setIsSearchOpen(false)} style={ST.proCancelBtn}>
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AnalysisModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                chartImage={chartBase64}
                symbol={symbol}
            />

            <FearGreedIndex
                isOpen={isSentimentOpen}
                onClose={() => setIsSentimentOpen(false)}
            />
            <LiquidityMapModal
                isOpen={isLiquidityOpen}
                onClose={() => setIsLiquidityOpen(false)}
            />
            <WhaleRadarModal
                isOpen={isWhaleRadarOpen}
                onClose={() => setIsWhaleRadarOpen(false)}
            />

            {/* WATCHLIST DRAWER */}
            <div className={`dashboard-drawer dashboard-drawer--portfolio ${isPortfolioOpen ? 'open' : ''}`}>
                <div className="dashboard-drawer__header">
                    <div>
                        <div className="dashboard-drawer__eyebrow">Portfolio Vault</div>
                        <h2 className="dashboard-drawer__title">Watchlist</h2>
                    </div>

                    <button
                        className="dashboard-drawer__close"
                        onClick={closeAllDrawers}
                        style={{ display: 'grid', placeItems: 'center' }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="dashboard-drawer__hero">
                    <div className="dashboard-drawer__heroIcon">◈</div>
                    <div>
                        <div className="dashboard-drawer__heroTitle">Tracked Assets</div>
                        <div className="dashboard-drawer__heroText">
                            Save assets you want to monitor closely.
                        </div>
                    </div>
                </div>

                <div className="dashboard-drawer__inputWrap">
                    <input
                        className="dashboard-drawer__input"
                        placeholder="Type ticker..."
                        value={portfolioInput}
                        onChange={(e) => setPortfolioInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
                    />
                    <button className="dashboard-drawer__addBtn" onClick={addToWatchlist}>
                        Add
                    </button>
                </div>

                <div className="dashboard-drawer__list custom-scrollbar">
                    {/* BUNUNLA ƏVƏZ EDİN */}
                    {(!watchlist || watchlist.length === 0) ? (
                        <div className="dashboard-empty-state">No watchlist items yet</div>
                    ) : (
                        watchlist.map((item, index) => (
                            <div className="dashboard-drawer__item" key={item.id || index}>
                                <div className="dashboard-drawer__itemContent">
                                    <div className="dashboard-drawer__symbol">
                                        {item.symbol || 'COIN'}
                                    </div>
                                    <div className="dashboard-drawer__subtext">
                                        Saved asset
                                    </div>
                                </div>

                                <button
                                    className="dashboard-drawer__removeBtn"
                                    onClick={() => removeFromWatchlist(item.symbol)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* TELEGRAM DRAWER */}
            <div className={`dashboard-drawer dashboard-drawer--telegram ${isTelegramModalOpen ? 'open' : ''}`}>
                <div className="dashboard-drawer__header">
                    <div>
                        <div className="dashboard-drawer__eyebrow">Notifications</div>
                        <h2 className="dashboard-drawer__title">Telegram</h2>
                    </div>

                    <button
                        className="dashboard-drawer__close"
                        onClick={closeAllDrawers}
                        style={{ display: 'grid', placeItems: 'center' }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="dashboard-drawer__hero">
                    <div className="dashboard-drawer__heroIcon">✈</div>
                    <div>
                        <div className="dashboard-drawer__heroTitle">Delivery Channel</div>
                        <div className="dashboard-drawer__heroText">
                            Connect Telegram to receive notifications externally.
                        </div>
                    </div>
                </div>

                <div className="dashboard-telegram-box">
                    <div
                        className={`dashboard-telegram-status ${
                            telegramStatus?.connected ? 'connected' : 'disconnected'
                        }`}
                    >
                        Status: {telegramStatus?.connected ? 'Connected' : 'Not connected'}
                    </div>

                    <div className="dashboard-telegram-actions">
                        <button
                            className="dashboard-drawer__addBtn dashboard-drawer__addBtn--telegram"
                            onClick={initTelegramConnection}
                        >
                            Connect
                        </button>
                        <button
                            className="dashboard-drawer__removeBtn"
                            onClick={confirmTelegramConnection}
                        >
                            Confirm
                        </button>
                        <button
                            className="dashboard-drawer__removeBtn"
                            onClick={handleTelegramDisconnect}
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>

            {/* ALERTS DRAWER */}
            <div className={`dashboard-drawer dashboard-drawer--alert ${isAlertModalOpen ? 'open' : ''}`}>
                <div className="dashboard-drawer__header">
                    <div>
                        <div className="dashboard-drawer__eyebrow">Automation</div>
                        <h2 className="dashboard-drawer__title">Alerts</h2>
                    </div>

                    <button
                        className="dashboard-drawer__close"
                        onClick={closeAllDrawers}
                        style={{ display: 'grid', placeItems: 'center' }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="dashboard-drawer__hero">
                    <div className="dashboard-drawer__heroIcon">◎</div>
                    <div>
                        <div className="dashboard-drawer__heroTitle">Price Triggers</div>
                        <div className="dashboard-drawer__heroText">
                            Create structured alerts for key market levels.
                        </div>
                    </div>
                </div>

                <div className="dashboard-drawer__inputStack">
                    <input
                        className="dashboard-drawer__input"
                        placeholder="Symbol"
                        value={alertInput?.symbol || ''}
                        onChange={(e) =>
                            setAlertInput((prev) => ({ ...prev, symbol: e.target.value }))
                        }
                    />

                    <input
                        className="dashboard-drawer__input"
                        placeholder="Target price"
                        value={alertInput?.targetPrice || ''}
                        onChange={(e) =>
                            setAlertInput((prev) => ({ ...prev, targetPrice: e.target.value }))
                        }
                    />

                    <button className="dashboard-drawer__addBtn dashboard-drawer__addBtn--alert full" onClick={addAlert}>
                        Create Alert
                    </button>
                </div>

                <div className="dashboard-drawer__list custom-scrollbar">
                    {/* BUNUNLA ƏVƏZ EDİN */}
                    {(!alerts || alerts.length === 0) ? (
                        <div className="dashboard-empty-state">No alerts created</div>
                    ) : (
                        alerts.map((alert, index) => (
                            <div className="dashboard-drawer__item" key={alert.id || index}>
                                <div className="dashboard-drawer__itemContent">
                                    <div className="dashboard-drawer__symbol">
                                        {alert.symbol || 'COIN'}
                                    </div>
                                    <div className="dashboard-drawer__subtext">
                                        Target: {alert.targetPrice || '-'}
                                    </div>
                                </div>

                                <button
                                    className="dashboard-drawer__removeBtn"
                                    onClick={() => handleDeleteClick(alert)}
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {deleteTarget && (
                <div style={ST.refinedOverlayStyle}>
                    <div className="fade-in" style={ST.refinedBoxStyle}>
                        <h3 style={ST.refinedTitleStyle}>DELETE ALERT</h3>
                        <p style={{color: '#94a3b8', marginTop: 12}}>
                            Are you sure you want to delete this alert?
                        </p>
                        <div style={{display: 'flex', gap: '12px', marginTop: '24px'}}>
                            <button onClick={confirmDelete} style={ST.proConfirmBtn}>
                                DELETE
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                style={ST.proCancelBtn}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NotificationDrawer
                isOpen={notificationDrawerOpen}
                onClose={() => setNotificationDrawerOpen(false)}
                notifications={notifications}
                unreadCount={notificationUnreadCount}
                loading={notificationLoading}
                onMarkAsRead={handleMarkNotificationRead}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
            />
        </div>
    );
};

export default DashboardShell;