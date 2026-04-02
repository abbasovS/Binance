import React from 'react';
import './MarketInsights.css';

const MarketInsights = () => {
    const insights = [
        {
            id: 1,
            title: "Bullish Engulfing",
            type: "Reversal",
            image: "https://www.tradingview.com/x/vU6q3Q6B/", // Örnek görsel linki
            desc: "Büyük bir yeşil mum, önceki kırmızı mumu tamamen yutar. Bu, alıcıların kontrolü ele aldığını gösterir.",
            proTip: "Desteğin hemen üzerinde oluşursa güvenilirliği artar."
        },
        {
            id: 2,
            title: "Hammer (Çekiç)",
            type: "Reversal",
            image: "https://www.tradingview.com/x/8S9Z3R2P/",
            desc: "Uzun alt fitil, fiyatın düştüğünü ancak alıcılar tarafından hızla yukarı itildiğini gösterir.",
            proTip: "Dip seviyelerde dönüşün habercisidir."
        },
        {
            id: 3,
            title: "Head & Shoulders",
            type: "Bearish",
            image: "https://www.tradingview.com/x/5X2A1N8M/",
            desc: "Üç tepe noktası oluşur, ortadaki en yüksektir. Yükselen trendin bittiğinin sinyalidir.",
            proTip: "Boyun çizgisi kırıldığında işlem hacmine dikkat edin."
        }
    ];

    return (
        <div className="insights-container">
            <div className="academy-header">
                <span className="academy-icon">📚</span>
                <h3>Arena-MS Price Action Guide</h3>
            </div>

            <div className="insights-grid">
                {insights.map((item) => (
                    <div key={item.id} className="insight-card-pro">
                        <div className="insight-image-box">
                            {/* Görsel Bölmesi */}
                            <img src={item.image} alt={item.title} className="pattern-img" />
                            <div className="type-overlay">{item.type}</div>
                        </div>
                        <div className="insight-content">
                            <h4>{item.title}</h4>
                            <p>{item.desc}</p>
                            <div className="tip-tag">
                                <strong>Taktik:</strong> {item.proTip}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketInsights;