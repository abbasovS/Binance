import React, { useState } from 'react';

const DashboardSidebar = ({
                              setIsSearchOpen,
                              setIsSentimentOpen,
                              setIsLiquidityOpen,
                              setIsWhaleRadarOpen,
                          }) => {
    const [isNotificationsMuted, setIsNotificationsMuted] = useState(false);

    return (
        <aside className="dashboard-sidebar">
            <div className="dashboard-sidebar__top">
                <div className="dashboard-sidebar__menu">
                    {/* 1. Dashboard */}
                    <button className="dashboard-sidebar__item active" title="Dashboard">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                    </button>

                    {/* 2. Technical Analysis */}
                    <button
                        className="dashboard-sidebar__item"
                        title="Technical Analysis"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="3 3 3 21 21 21"></polyline>
                            <polyline points="3 17 9 11 13 15 21 7"></polyline>
                            <polyline points="14 7 21 7 21 14"></polyline>
                        </svg>
                    </button>

                    {/* 3. Liquidity Map */}
                    <button
                        className="dashboard-sidebar__item"
                        title="Liquidity Map"
                        onClick={() => setIsLiquidityOpen(true)}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 12 12 17 22 12"></polyline>
                            <polyline points="2 17 12 22 22 17"></polyline>
                        </svg>
                    </button>

                    {/* 4. Whale Radar */}
                    <button
                        className="dashboard-sidebar__item"
                        title="Whale Radar"
                        onClick={() => setIsWhaleRadarOpen(true)}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="2"></circle>
                            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
                        </svg>
                    </button>

                    {/* 5. Sentiment Index */}
                    <button
                        className="dashboard-sidebar__item"
                        title="Sentiment Index"
                        onClick={() => setIsSentimentOpen(true)}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
                            <path d="M12 12l3.5 -3.5"></path>
                            <path d="M3 12a9 9 0 1 1 18 0"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="dashboard-sidebar__bottom">
                {/* 6. Notifications */}
                <button
                    className={`dashboard-sidebar__item dashboard-sidebar__item--notification ${
                        isNotificationsMuted ? 'muted' : ''
                    }`}
                    title={isNotificationsMuted ? 'Notifications Muted' : 'Notifications Enabled'}
                    onClick={() => setIsNotificationsMuted((prev) => !prev)}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;