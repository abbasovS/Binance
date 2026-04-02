import React, { useEffect } from 'react';

const AnalysisModal = ({ isOpen, onClose, chartImage, symbol }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div
                style={styles.container}
                className="terminal-container"
                onClick={(e) => e.stopPropagation()}
            >
                {/* CYBER CORNER ACCENTS */}
                <div style={{ ...styles.corner, top: -1, left: -1, borderLeft: '2px solid #10b981', borderTop: '2px solid #10b981' }} />
                <div style={{ ...styles.corner, top: -1, right: -1, borderRight: '2px solid #10b981', borderTop: '2px solid #10b981' }} />
                <div style={{ ...styles.corner, bottom: -1, left: -1, borderLeft: '2px solid #10b981', borderBottom: '2px solid #10b981' }} />
                <div style={{ ...styles.corner, bottom: -1, right: -1, borderRight: '2px solid #10b981', borderBottom: '2px solid #10b981' }} />

                {/* HEADER SECTION */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <div style={styles.pulseDot} />
                        <div>
                            <div style={styles.titleRow}>
                                <span style={styles.title}>{symbol}</span>
                                <span style={styles.pair}>/ USDT</span>
                            </div>
                            <div style={styles.status}>SYSTEM: ONLINE • SMC ENGINE ACTIVE</div>
                        </div>
                    </div>

                    <div style={styles.headerRight}>
                        <div style={styles.dataNode}>
                            <span style={styles.nodeLabel}>SCAN DEPTH</span>
                            <span style={styles.nodeValue}>ULTRA-DEEP</span>
                        </div>
                        <button onClick={onClose} style={styles.exitBtn} className="pro-exit-btn">
                            CLOSE TERMINAL
                        </button>
                    </div>
                </div>

                {/* MAIN CHART AREA */}
                <div style={styles.chartArea}>
                    {/* Grid Effect */}
                    <div style={styles.gridOverlay} />
                    {/* Moving Scan Line */}
                    <div className="scan-line" />

                    {chartImage ? (
                        <div style={styles.imageWrapper}><img
                                src={`data:image/png;base64,${chartImage}`}
                                alt="Market Analysis"
                                style={styles.mainImage}
                            />
                        </div>
                    ) : (
                        <div style={styles.loading}>
                            <div className="neural-spinner"></div>
                            <p style={styles.loadingText}>CALCULATING NEURAL PROJECTION...</p>
                        </div>
                    )}
                </div>

                {/* FOOTER SECTION */}
                <div style={styles.footer}>
                    <div style={styles.footerLogs}>
                        <span style={styles.logItem}><span style={styles.dim}>SIGNAL:</span> <span style={{color: '#10b981'}}>STABLE</span></span>
                        <span style={styles.logItem}><span style={styles.dim}>TIMEFRAME:</span> 4H / DAILY</span>
                        <span style={styles.logItem}><span style={styles.dim}>LIQUIDITY:</span> DETECTED</span>
                    </div>
                    <div style={styles.copyright}>© 2026 CRYPTO INTELLIGENCE UNIT</div>
                </div>
            </div>
        </div>
    );
};

// --- STYLES (Inline for better control) ---
const styles = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 2, 6, 0.95)',
        backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex',
        justifyContent: 'center', alignItems: 'flex-start', paddingTop: '15px'
    },
    container: {
        width: '98%', maxWidth: '1400px', height: '92vh', background: '#020205',
        borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)',
        display: 'flex', flexDirection: 'column', position: 'relative'
    },
    corner: { position: 'absolute', width: '20px', height: '20px', zIndex: 5 },
    header: {
        padding: '15px 25px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
    pulseDot: {
        width: '8px', height: '8px', background: '#10b981', borderRadius: '50%',
        animation: 'pulseEmerald 2s infinite'
    },
    titleRow: { display: 'flex', alignItems: 'baseline', gap: '5px' },
    title: { color: '#fff', fontSize: '20px', fontWeight: '900', letterSpacing: '2px' },
    pair: { color: 'rgba(255,255,255,0.2)', fontSize: '14px' },
    status: { fontSize: '9px', color: '#64748b', letterSpacing: '1px', marginTop: '2px' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '30px' },
    dataNode: { textAlign: 'right' },
    nodeLabel: { display: 'block', fontSize: '8px', color: '#475569', fontWeight: 'bold' },
    nodeValue: { fontSize: '12px', color: '#fff', fontFamily: 'monospace' },
    exitBtn: {
        background: 'transparent', border: '1px solid #333', color: '#94a3b8',
        padding: '8px 16px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    chartArea: {
        flex: 1, position: 'relative', background: '#000', overflow: 'hidden',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    },
    gridOverlay: {
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px', zIndex: 2, pointerEvents: 'none'
    },
    imageWrapper: { width: '100%', height: '100%', zIndex: 1 },
    mainImage: { width: '100%', height: '100%', objectFit: 'contain' },
    footer: {
        padding: '10px 25px', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    footerLogs: { display: 'flex', gap: '25px', fontSize: '10px', color: '#fff', fontFamily: 'monospace' },
    logItem: { letterSpacing: '1px' },
    dim: { color: '#475569' },
    copyright: { fontSize: '9px', color: '#27272a', fontWeight: 'bold' },
    loading: { textAlign: 'center' },
    loadingText: { color: '#10b981', fontSize: '11px', letterSpacing: '4px', marginTop: '20px' }
};

export default AnalysisModal;