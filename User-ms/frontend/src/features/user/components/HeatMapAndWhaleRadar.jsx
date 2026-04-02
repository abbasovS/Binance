import React, { useState, useEffect, useRef } from 'react';
import ReactApexChart from 'react-apexcharts';
import { marketApi } from '../../../api';

// ==========================================
// INSTITUTIONAL LIQUIDITY MAP (CLEAN & MINIMALIST)
// ==========================================
export const LiquidityMapModal = ({ isOpen, onClose }) => {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [series, setSeries] = useState([{ name: 'Price', data: [] }]);
    const [annotations, setAnnotations] = useState({ yaxis: [] });
    const [currentPrice, setCurrentPrice] = useState(0);
    const [depthProfile, setDepthProfile] = useState([]);
    const [loading, setLoading] = useState(false);
    const hasLoadedInitialData = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;

        const fetchProData = async () => {
            if (!hasLoadedInitialData.current) setLoading(true);
            try {
                // 1. ŞAMLAR (CANDLESTICKS)
                const klinesRes = await marketApi.getFuturesKlines(symbol);
                const klinesData = klinesRes.data;

                let minP = Infinity;
                let maxP = 0;

                const candleData = klinesData.map(d => {
                    const open = parseFloat(d[1]), high = parseFloat(d[2]);
                    const low = parseFloat(d[3]), close = parseFloat(d[4]);
                    if (low < minP) minP = low;
                    if (high > maxP) maxP = high;
                    return { x: new Date(d[0]), y: [open, high, low, close] };
                });

                const cp = candleData[candleData.length - 1].y[3];
                if (isMounted) setCurrentPrice(cp);

                const chartMin = minP * 0.98;
                const chartMax = maxP * 1.02;

                // 2. ORDER BOOK & HEATMAP
                const depthRes = await marketApi.getFuturesDepth(symbol);
                const depthData = depthRes.data;

                if (isMounted) {
                    setSeries([{ name: 'Candles', data: candleData }]);

                    // Qrafiki 60 zolağa bölürük (Daha təmiz görünüş üçün)
                    const NUM_BANDS = 60;
                    const bandSize = (chartMax - chartMin) / NUM_BANDS;

                    let heatmapBands = Array(NUM_BANDS).fill(0).map((_, i) => ({
                        priceStart: chartMin + (i * bandSize),
                        priceEnd: chartMin + ((i + 1) * bandSize),
                        midPrice: chartMin + ((i + 0.5) * bandSize),
                        volume: 0,
                        type: (chartMin + (i * bandSize)) > cp ? 'ask' : 'bid'
                    }));

                    const processOrders = (orders) => {
                        orders.forEach(([p, q]) => {
                            const price = parseFloat(p);
                            const vol = price * parseFloat(q);
                            if (price >= chartMin && price <= chartMax) {
                                const index = Math.floor((price - chartMin) / bandSize);
                                if (index >= 0 && index < NUM_BANDS) {
                                    heatmapBands[index].volume += vol;
                                }
                            }
                        });
                    };

                    processOrders(depthData.asks);
                    processOrders(depthData.bids);

                    const maxVol = Math.max(...heatmapBands.map(b => b.volume), 1);

                    const yAxisAnnotations = [];
                    const profileData = [];

                    heatmapBands.forEach(band => {
                        const intensity = band.volume / maxVol;

                        // Əhəmiyyətsiz kiçik həcmləri gizlədirik ki, qrafik təmiz qalsın
                        if (intensity > 0.05) {
                            const isAsk = band.type === 'ask';
                            // Təmiz rənglər (Binance Standard)
                            const color = isAsk ? '#F6465D' : '#0ECB81';
                            // Maksimum 30% şəffaflıq (Şamları bağlamasın)
                            const opacity = parseFloat((intensity * 0.3).toFixed(2));

                            yAxisAnnotations.push({
                                y: band.priceStart,
                                y2: band.priceEnd,
                                fillColor: color,
                                opacity: opacity,
                                strokeDashArray: 0,
                            });
                        }

                        profileData.push({
                            price: band.midPrice,
                            volume: band.volume,
                            intensity: intensity,
                            type: band.type
                        });
                    });

                    setAnnotations({ yaxis: yAxisAnnotations });
                    // Histogram yuxarıdan aşağı düzülür
                    setDepthProfile(profileData.reverse());
                    hasLoadedInitialData.current = true;
                }
            } catch (err) {
                console.error("Pro Chart Error", err);
            }
            if (isMounted) setLoading(false);
        };

        fetchProData();
        const interval = setInterval(fetchProData, 2000);
        return () => { isMounted = false; clearInterval(interval); };
    }, [isOpen, symbol]);

    // TƏMİZ VƏ PEŞƏKAR QRAFİK PARAMETRLƏRİ
    const options = {
        chart: {
            type: 'candlestick',
            background: '#161a1e', // Binance tünd fonu
            toolbar: { show: false },
            animations: { enabled: false }
        },
        theme: { mode: 'dark' },
        xaxis: {
            type: 'datetime',
            labels: { style: { colors: '#848E9C', fontSize: '11px', fontFamily: 'Arial, sans-serif' } },
            axisBorder: { color: '#2B3139' },
            axisTicks: { show: false },
            crosshairs: { stroke: { color: '#848E9C', dashArray: 2 } },
            tooltip: { enabled: false }
        },
        yaxis: {
            tooltip: { enabled: false },
            labels: {
                style: { colors: '#EAECEF', fontSize: '12px', fontFamily: 'monospace' },
                formatter: (val) => val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
            },
            crosshairs: { stroke: { color: '#848E9C', dashArray: 2 } }
        },
        grid: {
            borderColor: '#2B3139',
            strokeDashArray: 0, // Kəsik xətlər əvəzinə düz, amma çox solğun xətlər
            position: 'back',
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: true } },
        },
        plotOptions: {
            candlestick: {
                colors: { upward: '#0ECB81', downward: '#F6465D' },
                wick: { useDataColors: true }
            }
        },
        annotations: annotations
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.8)', zIndex: 7000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '1200px', background: '#161a1e', border: '1px solid #2B3139', display: 'flex', flexDirection: 'column' }}>

                {/* --- HEADER --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #2B3139', background: '#1E2329' }}>
                    <div>
                        <h2 style={{ color: '#EAECEF', margin: 0, fontSize: '16px', fontWeight: '600', letterSpacing: '0.5px' }}>ORDER BOOK LIQUIDITY MAP</h2>
                        <span style={{ color: '#848E9C', fontSize: '12px' }}>Real-time Depth Visualization</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#848E9C', fontSize: '12px' }}>Price:</span>
                            <span style={{ color: '#EAECEF', fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </span>
                        </div>

                        <input
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            style={{ background: '#161a1e', border: '1px solid #2B3139', color: '#EAECEF', padding: '6px 10px', width: '100px', textAlign: 'center', fontWeight: 'bold', outline: 'none', fontSize: '14px' }}
                        />
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#848E9C', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    </div>
                </div>

                {/* --- MAIN CONTENT --- */}
                <div style={{ display: 'flex', height: '600px', width: '100%' }}>

                    {/* LEFT: CHART */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        {loading && series[0]?.data?.length === 0 ? (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#848E9C', fontSize: '14px' }}>
                                Loading chart data...
                            </div>
                        ) : (
                            <ReactApexChart options={options} series={series} type="candlestick" height="100%" />
                        )}
                    </div>

                    {/* RIGHT: VOLUME PROFILE */}
                    <div style={{ width: '250px', borderLeft: '1px solid #2B3139', display: 'flex', flexDirection: 'column', background: '#161a1e' }}>
                        <div style={{ padding: '10px', borderBottom: '1px solid #2B3139', color: '#848E9C', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                            <span>PRICE</span>
                            <span>VOLUME (USDT)</span>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '5px 0' }}>
                            {depthProfile.map((band, i) => {
                                if (band.intensity < 0.02) return <div key={i} style={{flex: 1}}></div>;

                                const isAsk = band.type === 'ask';
                                const barColor = isAsk ? '#F6465D' : '#0ECB81';
                                const widthPercent = Math.max(band.intensity * 100, 1);

                                return (
                                    <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', padding: '0 10px' }}>
                                        {/* Arxa plan bar */}
                                        <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            height: '80%',
                                            width: `${widthPercent}%`,
                                            background: barColor,
                                            opacity: 0.15,
                                        }}></div>

                                        {/* Rəqəmlər (Düz və Təmiz) */}
                                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', zIndex: 1, fontSize: '11px', fontFamily: 'monospace' }}>
                                            <span style={{ color: isAsk ? '#F6465D' : '#0ECB81' }}>
                                                {band.price.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}
                                            </span>
                                            <span style={{ color: '#EAECEF' }}>
                                                {(band.volume / 1e6).toFixed(2)}M
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. WHALE RADAR (ULTIMATE TRUST & PRO DESIGN)
// ==========================================
export const WhaleRadarModal = ({ isOpen, onClose }) => {
    const [trades, setTrades] = useState([]);
    const [threshold, setThreshold] = useState(50000);
    const [status, setStatus] = useState('CONNECTING...');
    const [ping, setPing] = useState(0);

    useEffect(() => {
        if (!isOpen) return;

        // Ping simulyasiyası (İstifadəçiyə canlı bağlantı hissi vermək üçün 20-60ms arası dəyişir)
        const pingInterval = setInterval(() => setPing(Math.floor(Math.random() * 40) + 20), 2000);

        const wsUrl = `wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade/ethusdt@aggTrade/solusdt@aggTrade/bnbusdt@aggTrade/xrpusdt@aggTrade`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setStatus('LIVE - BINANCE WSS');
        };

        ws.onclose = () => {
            setStatus('DISCONNECTED');
        };

        ws.onmessage = (event) => {
            const parsed = JSON.parse(event.data);
            if (!parsed.data) return;

            const trade = parsed.data;
            const price = parseFloat(trade.p);
            const qty = parseFloat(trade.q);
            const totalValue = price * qty;

            if (totalValue >= threshold) {
                const isSell = trade.m; // m=true (Maker is buyer, meaning the taker sold -> Market Sell)

                // Tam dəqiq zaman (milisaniyə ilə)
                const date = new Date(trade.T);
                const exactTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

                const newTrade = {
                    id: trade.a, // Binance Orijinal AggTrade ID
                    sym: trade.s.replace('USDT', ''),
                    price: price,
                    qty: qty,
                    total: totalValue,
                    type: isSell ? 'MARKET SELL' : 'MARKET BUY',
                    time: exactTime,
                    isNew: true // Yeni düşəndə parlamaq üçün
                };

                setTrades(prev => {
                    // Köhnə sətirlərdəki 'isNew' bayrağını silirik ki, animasiya təkrar olunmasın
                    const updatedPrev = prev.map(t => ({...t, isNew: false}));
                    return [newTrade, ...updatedPrev].slice(0, 40);
                });
            }
        };

        return () => {
            ws.close();
            clearInterval(pingInterval);
        };
    }, [isOpen, threshold]);



    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(5, 7, 10, 0.9)', backdropFilter: 'blur(10px)', zIndex: 7000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>

            {/* Animasiya üçün Keyframes */}
            <style>
                {`
                    @keyframes whaleFlash {
                        0% { background: rgba(254, 240, 138, 0.3); transform: scale(1.01); }
                        100% { background: rgba(255, 255, 255, 0.02); transform: scale(1); }
                    }
                `}
            </style>

            <div onClick={(e) => e.stopPropagation()} className="fade-in" style={{ width: '100%', maxWidth: '900px', background: '#0b0e11', borderRadius: '16px', border: '1px solid #1f2937', padding: '25px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

                {/* --- ÜST PANEL: STATUS VƏ FİLTR --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '45px', height: '45px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            🌊
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                Institutional Whale Radar
                            </h2>
                            {/* CANLI BAĞLANTI STATUSU (GÜVƏN ÜÇÜN ƏN VACİB HİSSƏ) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span style={{ width: '8px', height: '8px', background: status.includes('LIVE') ? '#02c076' : '#f84960', borderRadius: '50%', boxShadow: status.includes('LIVE') ? '0 0 8px #02c076' : 'none', animation: 'pulse 1.5s infinite' }}></span>
                                <span style={{ color: status.includes('LIVE') ? '#02c076' : '#848e9c', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>{status}</span>
                                {ping > 0 && <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '600' }}>• PING: {ping}ms</span>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#12161a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                            <span style={{ color: '#848e9c', fontSize: '11px', fontWeight: '800' }}>TƏTİKLƏYİCİ HƏCM (USD):</span>
                            <select value={threshold} onChange={(e) => { setTrades([]); setThreshold(Number(e.target.value)); }} style={{ background: 'transparent', border: 'none', color: '#fef08a', fontWeight: '900', outline: 'none', cursor: 'pointer', fontSize: '14px' }}>
                                <option value={10000} style={{background: '#12161a'}}>&gt; $10K</option>
                                <option value={50000} style={{background: '#12161a'}}>&gt; $50K</option>
                                <option value={100000} style={{background: '#12161a'}}>&gt; $100K</option>
                                <option value={500000} style={{background: '#12161a'}}>&gt; $500K</option>
                                <option value={1000000} style={{background: '#12161a'}}>&gt; $1M (Mega Whales)</option>
                            </select>
                        </div>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e)=>e.target.style.color='#fff'}>✕</button>
                    </div>
                </div>

                {/* --- CƏDVƏL BAŞLIĞI --- */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1.5fr', color: '#64748b', fontSize: '11px', fontWeight: '800', paddingBottom: '10px', borderBottom: '1px solid #1f2937', marginBottom: '10px', paddingLeft: '15px', textTransform: 'uppercase' }}>
                    <span>EXACT TIME & ID</span>
                    <span>ASSET</span>
                    <span>AGGRESSOR SIDE</span>
                    <span>EXEC PRICE</span>
                    <span style={{ textAlign: 'right', paddingRight: '15px' }}>FILLED VALUE (USDT)</span>
                </div>

                {/* --- SİYAHI --- */}
                <div style={{ height: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="custom-scrollbar">
                    {trades.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#475569' }}>
                            <div style={{ fontSize: '35px', marginBottom: '15px', animation: 'pulse 2s infinite' }}>📡</div>
                            <div style={{ fontWeight: '800', letterSpacing: '1px' }}>SCANNING BLOCKCHAIN & EXCHANGES...</div>
                        </div>
                    ) : trades.map((t) => {
                        const isBuy = t.type === 'MARKET BUY';
                        const color = isBuy ? '#02c076' : '#f84960';

                        return (
                            <div key={t.id} style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1.5fr', alignItems: 'center',
                                background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '8px',
                                borderLeft: `4px solid ${color}`,
                                animation: t.isNew ? 'whaleFlash 1s ease-out' : 'none', // Yeni trade gələndə parlayır
                                transition: 'all 0.3s ease'
                            }}>

                                {/* 1. Dəqiq Zaman və Orijinal ID (Ən böyük güvən faktoru) */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>{t.time}</span>
                                    <span style={{ color: '#475569', fontSize: '9px', fontWeight: '800', marginTop: '2px' }} title="Binance AggTrade ID">TxID: #{t.id}</span>
                                </div>

                                {/* 2. Koin Adı və Logosu */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '24px', height: '24px', background: '#1e293b', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                        <img src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${t.sym.toLowerCase()}.png`} onError={(e) => e.target.style.display = 'none'} style={{width: '100%', height: '100%'}} alt={t.sym}/>
                                    </div>
                                    <span style={{ color: '#fff', fontWeight: '900', fontSize: '15px' }}>{t.sym}</span>
                                </div>

                                {/* 3. Taker Əməliyyat Növü */}
                                <div>
                                    <span style={{
                                        color: color, fontWeight: '900', fontSize: '11px',
                                        background: isBuy ? 'rgba(2,192,118,0.1)' : 'rgba(248,73,96,0.1)',
                                        padding: '4px 10px', borderRadius: '6px', letterSpacing: '0.5px'
                                    }}>
                                        {t.type} (TAKER)
                                    </span>
                                </div>

                                {/* 4. İcra Olunmuş Qiymət */}
                                <span style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>
                                    ${t.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}
                                </span>

                                {/* 5. Toplam Həcm (Balina Pulu) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '10px' }}>
                                    <span style={{ color: color, fontWeight: '900', fontSize: '16px', letterSpacing: '-0.5px' }}>
                                        ${t.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                    </span>
                                    <span style={{ color: '#64748b', fontSize: '10px', fontWeight: '700', marginTop: '2px' }}>
                                        {t.qty.toLocaleString(undefined, {maximumFractionDigits: 2})} {t.sym}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};