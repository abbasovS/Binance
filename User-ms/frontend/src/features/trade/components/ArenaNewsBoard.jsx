import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import './ArenaNewsBoard.css';
import { newsApi } from '../../../api';

const pageSize = 4;

const ArenaNewsBoard = ({ compact = false }) => {
    const [globalNews, setGlobalNews] = useState([]);
    const [portfolioNews, setPortfolioNews] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [page, setPage] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const formatDisplayDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Unknown date';

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTodayDate = () => {
        return new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isValidUrl = (url) => {
        if (!url || url === '#') return false;
        if (url.includes('cryptopanic.com/news/') && /\d{10,}$/.test(url)) return false;
        return true;
    };

    const cleanText = (text) => {
        if (!text || typeof text !== 'string') {
            return 'No data available at the moment.';
        }

        let cleaned = text.replace(/<[^>]+>/g, '');
        cleaned = cleaned.replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&[a-z]+;/gi, ' ');

        cleaned = cleaned.replace(/^[\s"'«»]+/, '');
        return cleaned.trim();
    };

    const buildSourceLabel = (item) => {
        const source = item?.sourceName || 'Unknown Source';
        const symbol = item?.symbol || 'Market';
        const date = formatDisplayDate(item?.createdAt);
        return `${source} • ${symbol} • ${date}`;
    };

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const userEmail = localStorage.getItem('userEmail');

                const [globalRes, portfolioRes] = await Promise.allSettled([
                    newsApi.getGlobalNews(16),
                    newsApi.getPortfolioNews(userEmail, 16)
                ]);

                setGlobalNews(
                    globalRes.status === 'fulfilled' ? globalRes.value.data || [] : []
                );

                setPortfolioNews(
                    portfolioRes.status === 'fulfilled' ? portfolioRes.value.data || [] : []
                );

                if (globalRes.status === 'rejected') {
                    toast.error('Could not update news. Please check your internet connection.', {
                        id: 'news-error'
                    });
                }
            } catch (e) {
                console.error('News failed to load', e);
                toast.error('System cannot connect to news service.', {
                    id: 'news-sys-error'
                });
            }
        };

        fetchNews();
        const interval = setInterval(fetchNews, 300000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activeTab]);

    const currentData = useMemo(() => {
        if (activeTab === 'global') {
            return {
                title: 'Global Market Briefing',
                subtitle: 'Macroeconomic developments, institutional positioning, regulation, and cross-market sentiment.',
                badge: 'Global',
                items: globalNews
            };
        }

        if (activeTab === 'portfolio') {
            return {
                title: 'Portfolio Watchlist Updates',
                subtitle: 'Relevant developments connected to the assets you are tracking.',
                badge: 'Portfolio',
                items: portfolioNews
            };
        }

        return null;
    }, [activeTab, globalNews, portfolioNews]);

    const pagedItems = useMemo(() => {
        if (!currentData) return [];
        const start = page * pageSize;
        return currentData.items.slice(start, start + pageSize);
    }, [currentData, page]);

    const handleTabOpen = (tabType) => {
        if (activeTab === tabType) return;
        setPage(0);
        setActiveTab(tabType);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 400);
    };

    const handleClose = () => {
        setActiveTab(null);
    };

    const totalPages = currentData ? Math.max(1, Math.ceil(currentData.items.length / pageSize)) : 1;

    return (
        <section className={`news-board-container ${compact ? 'compact-view' : ''}`}>
            <div className="news-surface-card">
                <div className="news-surface-card__header">
                    <div>
                        <div className="news-surface-card__eyebrow">Market Intelligence</div>
                        <h3 className="news-surface-card__title">News & Insights</h3>
                    </div>
                    <div className="news-surface-card__date">{getTodayDate()}</div>
                </div>

                <div className="news-surface-card__divider" />

                <div className="news-surface-grid">
                    <button
                        className="news-surface-tile"
                        type="button"
                        onClick={() => handleTabOpen('global')}
                    >
                        <div className="news-surface-tile__top">
                            <span className="news-surface-tile__badge">Global</span>
                            <span className="news-surface-tile__arrow">↗</span>
                        </div>
                        <h4 className="news-surface-tile__title">Global Market Briefing</h4>
                        <p className="news-surface-tile__text">
                            Broad market trends, regulation, macro shifts, and institutional developments.
                        </p>
                    </button>

                    <button
                        className="news-surface-tile"
                        type="button"
                        onClick={() => handleTabOpen('portfolio')}
                    >
                        <div className="news-surface-tile__top">
                            <span className="news-surface-tile__badge">Portfolio</span>
                            <span className="news-surface-tile__arrow">↗</span>
                        </div>
                        <h4 className="news-surface-tile__title">Portfolio Watchlist Updates</h4>
                        <p className="news-surface-tile__text">
                            Focused updates related to the assets and instruments you follow.
                        </p>
                    </button>
                </div>
            </div>

            {currentData && createPortal(
                <div className="news-modal-overlay" onClick={handleClose}>
                    <div
                        className={`news-modal ${isAnimating ? 'news-modal--animate' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="news-modal__header">
                            <div className="news-modal__heading">
                                <div className="news-modal__eyebrow">{currentData.badge} Intelligence</div>
                                <h2 className="news-modal__title">{currentData.title}</h2>
                                <p className="news-modal__subtitle">{currentData.subtitle}</p>
                            </div>

                            <button className="news-modal__close" onClick={handleClose} type="button">
                                Close
                            </button>
                        </div>

                        <div className="news-modal__toolbar">
                            <div className="news-modal__tabs">
                                <button
                                    type="button"
                                    className={`news-modal__tab ${activeTab === 'global' ? 'active' : ''}`}
                                    onClick={() => handleTabOpen('global')}
                                >
                                    Global Briefing
                                </button>
                                <button
                                    type="button"
                                    className={`news-modal__tab ${activeTab === 'portfolio' ? 'active' : ''}`}
                                    onClick={() => handleTabOpen('portfolio')}
                                >
                                    Portfolio Updates
                                </button>
                            </div>

                            <div className="news-modal__meta">
                                <span>{getTodayDate()}</span>
                                <span>{currentData.items.length} Articles</span>
                            </div>
                        </div>

                        <div className="news-modal__content custom-scroll">
                            {pagedItems.length === 0 ? (
                                <div className="news-empty-state">
                                    No news available in this section right now.
                                </div>
                            ) : (
                                <div className="news-article-list">
                                    {pagedItems.map((n, i) => (
                                        <article key={n.id || i} className="news-article-card">
                                            <div className="news-article-card__meta">
                                                {buildSourceLabel(n)}
                                            </div>

                                            <h3 className="news-article-card__title">
                                                {n.originalTitle || 'Untitled update'}
                                            </h3>

                                            <p className="news-article-card__summary">
                                                {cleanText(n.summaryEn || n.summaryAz)}
                                            </p>

                                            {isValidUrl(n.sourceUrl) && (
                                                <div className="news-article-card__footer">
                                                    <a
                                                        href={n.sourceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="news-article-card__link"
                                                    >
                                                        Open source
                                                    </a>
                                                </div>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="news-modal__pagination">
                            <button
                                className="news-page-btn"
                                type="button"
                                disabled={page === 0}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Previous
                            </button>

                            <div className="news-page-indicator">
                                Page {page + 1} / {totalPages}
                            </div>

                            <button
                                className="news-page-btn"
                                type="button"
                                disabled={(page + 1) * pageSize >= currentData.items.length}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
};

export default ArenaNewsBoard;