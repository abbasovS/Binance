import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast'; // NEW: Toast notifications imported
import './ArenaNewsBoard.css';
import { newsApi } from '../../../api';

const pageSize = 4;

const ArenaNewsBoard = ({ compact = false }) => {
    const [globalNews, setGlobalNews] = useState([]);
    const [portfolioNews, setPortfolioNews] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [page, setPage] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Date in Newspaper format
    const formatNewspaperDate = (dateString) => {
        if (!dateString) return "UNKNOWN DATE";
        const date = new Date(dateString);

        // FIX 1: Check if date is invalid to prevent application crash
        if (isNaN(date.getTime())) return "UNKNOWN DATE";

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase();
    };

    // Today's date for the newspaper header
    const getTodayDate = () => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase();
    };

    // URL validation
    const isValidUrl = (url) => {
        if (!url || url === '#') return false;
        // Do not show cryptopanic.com fallback news
        if (url.includes('cryptopanic.com/news/') && /\d{10,}$/.test(url)) return false;
        return true;
    };

    // Function to clean HTML tags and special characters
    const cleanText = (text) => {
        // FIX 2: If text is not a string, .replace would throw an error and freeze the system.
        if (!text || typeof text !== 'string') return "No data available at the moment.";

        let cleaned = text.replace(/<[^>]+>/g, '');
        cleaned = cleaned.replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&[a-z]+;/gi, ' ');
        cleaned = cleaned.replace(/^[\s"''""«»]+/, '');
        return cleaned.trim();
    };

    // Effect to refresh news every 5 minutes (or fetch on initial load)
    useEffect(() => {
        const fetchNews = async () => {
            try {
                const userEmail = localStorage.getItem('userEmail'); // İstifadəçi emailini götürürük

                const [globalRes, portfolioRes] = await Promise.allSettled([
                    newsApi.getGlobalNews(16),
                    newsApi.getPortfolioNews(userEmail, 16) // Email bura mütləq getməlidir
                ]);

                setGlobalNews(
                    globalRes.status === 'fulfilled' ? globalRes.value.data || [] : []
                );

                // Portfolio news will only work for logged-in users; sets empty array if failed
                setPortfolioNews(
                    portfolioRes.status === 'fulfilled' ? portfolioRes.value.data || [] : []
                );

                // FIX 3: If even Global news failed to load, there's a server or internet issue.
                if (globalRes.status === 'rejected') {
                    // id: 'news-error' added to prevent toast spamming every 5 minutes (UX)
                    toast.error("Could not update news. Please check your internet connection.", { id: 'news-error' });
                }

            } catch (e) {
                console.error('News failed to load', e);
                toast.error("System cannot connect to news service.", { id: 'news-sys-error' });
            }
        };

        fetchNews(); // Initial load

        const interval = setInterval(fetchNews, 300000); // Every 5 minutes

        return () => clearInterval(interval); // Cleanup
    }, []);

    // Effect to prevent body scroll when newspaper is open (Prod UX)
    useEffect(() => {
        if (activeTab !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup if component unmounts or tab closes
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activeTab]);

    // Determine data to show based on the active tab
    const currentData = useMemo(() => {
        if (activeTab === 'global') return {
            title: 'Global Macro Intelligence',
            edition: 'GLOBAL EDITION',
            items: globalNews
        };
        if (activeTab === 'portfolio') return {
            title: 'Portfolio Assets Radar',
            edition: 'INVESTOR EDITION',
            items: portfolioNews
        };
        return null;
    }, [activeTab, globalNews, portfolioNews]);

    // Slice items for Pagination
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
        setTimeout(() => setIsAnimating(false), 800);
    };

    const handleClose = () => {
        setActiveTab(null);
    };

    return (
        // compact prop added as a class for CSS
        <section className={`news-board-container ${compact ? 'compact-view' : ''}`}>

            <div className="minimal-paper-wrapper">
                <div className="minimal-paper">
                    <div className="mp-header-meta">
                        <span>EST. 2024</span>
                        <span>{getTodayDate()}</span>
                    </div>

                    <h1 className="mp-title">The Market Gazette</h1>
                    <div className="mp-divider"></div>
                    <div className="mp-index-title">TODAY'S INDEX</div>

                    <div className="mp-sections">
                        <div className="mp-section-item" onClick={() => handleTabOpen('global')}>
                            <div className="mp-section-top">
                                <span className="mp-sec-num">I.</span>
                                <span className="mp-sec-name">Global Macro Intelligence</span>
                            </div>
                            <p className="mp-sec-desc">Broad market trends, regulatory shifts, and institutional news.</p>
                        </div>

                        <div className="mp-section-item" onClick={() => handleTabOpen('portfolio')}>
                            <div className="mp-section-top">
                                <span className="mp-sec-num">II.</span>
                                <span className="mp-sec-name">Portfolio Asset Radar</span>
                            </div>
                            <p className="mp-sec-desc">Specific updates and alerts regarding your tracked assets.</p>
                        </div>
                    </div>
                </div>
            </div>

            {currentData && createPortal(
                <div className="modal-overlay" onClick={handleClose}>
                    <div
                        className={`open-newspaper ${isAnimating ? 'anim-unfold' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="close-btn" onClick={handleClose}>[ FOLD & CLOSE X ]</button>

                        <div className="single-column-page custom-scroll">
                            <header className="masthead">
                                <h1>The Market Gazette</h1>

                                <div className="modal-tabs">
                                    <button
                                        className={`modal-tab-btn ${activeTab === 'global' ? 'active' : ''}`}
                                        onClick={() => handleTabOpen('global')}
                                    >
                                        I. GLOBAL MACRO
                                    </button>
                                    <button
                                        className={`modal-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
                                        onClick={() => handleTabOpen('portfolio')}
                                    >
                                        II. PORTFOLIO RADAR
                                    </button>
                                </div>

                                <div className="meta-bar">
                                    <span>{currentData.edition}</span>
                                    <span>{getTodayDate()}</span>
                                    <span>PRICE: 1 SAT</span>
                                </div>
                            </header>

                            <div className="articles-container">
                                {pagedItems.map((n, i) => (
                                    <article key={n.id || i} className="article">
                                        <h2 className="article-headline">
                                            {n.originalTitle}
                                        </h2>
                                        <div className="article-sub">
                                            BY {n.sourceName?.toUpperCase() || 'UNKNOWN'} | {n.symbol || 'MARKET'} | {formatNewspaperDate(n.createdAt)}
                                        </div>
                                        <p className="article-text drop-cap">
                                            {cleanText(n.summaryEn || n.summaryAz)}
                                        </p>
                                        {isValidUrl(n.sourceUrl) &&  (
                                            <div className="article-read-more">
                                                <a href={n.sourceUrl} target="_blank" rel="noreferrer">Read Full Report »</a>
                                            </div>
                                        )}
                                    </article>
                                ))}
                                {pagedItems.length === 0 && <p className="no-news">No news available in this section.</p>}
                            </div>

                            <div className="pagination">
                                <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                                    « PREVIOUS
                                </button>
                                <span className="page-indicator">
                                    PAGE {page + 1} OF {Math.ceil(currentData.items.length / pageSize) || 1}
                                </span>
                                <button className="page-btn" disabled={(page + 1) * pageSize >= currentData.items.length} onClick={() => setPage(p => p + 1)}>
                                    NEXT »
                                </button>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </section>
    );
};

export default ArenaNewsBoard;