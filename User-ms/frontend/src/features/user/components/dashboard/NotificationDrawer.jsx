import React from 'react';

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const typeLabel = (type) => {
    switch (type) {
        case 'SUCCESS':
            return 'Success';
        case 'WARNING':
            return 'Warning';
        case 'ERROR':
            return 'Critical';
        case 'SYSTEM':
            return 'System';
        default:
            return 'Info';
    }
};

const typeClass = (type) => {
    switch (type) {
        case 'SUCCESS':
            return 'notification-panel__card--success';
        case 'WARNING':
            return 'notification-panel__card--warning';
        case 'ERROR':
            return 'notification-panel__card--error';
        case 'SYSTEM':
            return 'notification-panel__card--system';
        default:
            return 'notification-panel__card--info';
    }
};

const NotificationDrawer = ({
                                isOpen,
                                onClose,
                                notifications = [],
                                unreadCount = 0,
                                loading = false,
                                onMarkAsRead,
                                onMarkAllAsRead
                            }) => {
    return (
        <>
            {isOpen && (
                <div
                    className="notification-panel__backdrop"
                    onClick={onClose}
                />
            )}

            <aside className={`notification-panel ${isOpen ? 'open' : ''}`}>
                <div className="notification-panel__header">
                    <div className="notification-panel__headerContent">
                        <div className="notification-panel__icon">
                            <svg
                                width="18"
                                height="18"
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
                        </div>

                        <div>
                            <div className="notification-panel__eyebrow">Message Center</div>
                            <h2 className="notification-panel__title">Admin Messages</h2>
                        </div>
                    </div>

                    <button
                        className="notification-panel__close"
                        onClick={onClose}
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <div className="notification-panel__toolbar">
                    <div className="notification-panel__summary">
                        <span className="notification-panel__summaryDot" />
                        <span>{unreadCount} unread</span>
                    </div>

                    <button
                        className="notification-panel__markAll"
                        onClick={onMarkAllAsRead}
                        disabled={!notifications.length}
                        type="button"
                    >
                        Mark all read
                    </button>
                </div>

                <div className="notification-panel__body custom-scrollbar">
                    {loading ? (
                        <div className="notification-panel__empty">
                            <div className="notification-panel__emptyIcon">✦</div>
                            <div className="notification-panel__emptyTitle">Loading messages</div>
                            <div className="notification-panel__emptyText">
                                Please wait while your inbox updates.
                            </div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="notification-panel__empty">
                            <div className="notification-panel__emptyIcon">✉</div>
                            <div className="notification-panel__emptyTitle">No messages yet</div>
                            <div className="notification-panel__emptyText">
                                Admin announcements and account updates will appear here.
                            </div>
                        </div>
                    ) : (
                        notifications.map((item) => (
                            <div
                                key={item.id}
                                className={`notification-panel__card ${typeClass(item.type)} ${item.read ? 'is-read' : 'is-unread'}`}
                            >
                                <div className="notification-panel__cardTop">
                                    <div className="notification-panel__metaRow">
                                        <span className="notification-panel__typeTag">
                                            {typeLabel(item.type)}
                                        </span>
                                        <span className="notification-panel__time">
                                            {formatTime(item.createdAt)}
                                        </span>
                                    </div>

                                    {!item.read && (
                                        <span className="notification-panel__newBadge">
                                            New
                                        </span>
                                    )}
                                </div>

                                <div className="notification-panel__cardTitle">
                                    {item.title}
                                </div>

                                <div className="notification-panel__cardMessage">
                                    {item.message}
                                </div>

                                <div className="notification-panel__cardFooter">
                                    <div className="notification-panel__sender">
                                        {item.createdBy || 'System'}
                                    </div>

                                    {!item.read && (
                                        <button
                                            className="notification-panel__readBtn"
                                            onClick={() => onMarkAsRead(item.id)}
                                            type="button"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </>
    );
};

export default NotificationDrawer;