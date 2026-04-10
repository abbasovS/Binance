import React from 'react';
import WalletDropdown from './WalletDropdown';

const DashboardTopbar = ({
                             isAdmin,
                             navigate,
                             handleLogout,
                             unreadCount = 0,
                             onOpenNotifications
                         }) => {
    const userEmail = localStorage.getItem('userEmail') || 'user@mockfolio.com';
    const userLetter = userEmail[0]?.toUpperCase() || 'M';

    return (
        <div className="dashboard-topbar">
            <div className="dashboard-topbar__left">
                <div className="dashboard-topbar__heading">
                    <div className="dashboard-topbar__eyebrow">Premium Dashboard</div>
                    <h1 className="dashboard-topbar__title">MockFolio</h1>
                </div>

                <div className="dashboard-topbar__nav">
                    {isAdmin && (
                        <button onClick={() => navigate('/admin')}>Admin Panel</button>
                    )}
                </div>
            </div>

            <div className="dashboard-topbar__right">
                <WalletDropdown />

                <button
                    className="dashboard-topbar__iconBtn dashboard-topbar__iconBtn--notify"
                    title="Admin Messages"
                    type="button"
                    onClick={onOpenNotifications}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
                        <path d="m22 8-8.97 6.35a1.8 1.8 0 0 1-2.06 0L2 8"></path>
                    </svg>

                    {unreadCount > 0 && (
                        <span className="dashboard-topbar__badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                <div className="dashboard-topbar__profile">
                    <div className="dashboard-topbar__avatar">
                        {userLetter}
                    </div>
                </div>

                <button className="dashboard-topbar__logout" onClick={handleLogout}>
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default DashboardTopbar;