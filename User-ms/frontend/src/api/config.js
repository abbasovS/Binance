const normalizeBaseUrl = (value = '') => value.replace(/\/+$/, '');

export const GATEWAY_URL = normalizeBaseUrl(process.env.REACT_APP_GATEWAY_URL || '');

const withGateway = (path) => `${GATEWAY_URL}${path}`;

export const API_BASES = {
    crypto: withGateway('/api/crypto'),
    user: withGateway('/api/user'),
    admin: withGateway('/api/admin'),
    users: withGateway('/api/users'),
    trades: withGateway('/api/trades/user'),
    withdraw: withGateway('/api/withdraw'),
    analysis: withGateway('/analysis'),
    news: withGateway('/api/news'),
    market: withGateway('/api/market')
};

export const APP_CONFIG = {
    googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
};

export const EXTERNAL_APIS = {
    binance: 'https://api.binance.com',
    binanceFutures: 'https://fapi.binance.com',
    fearGreed: 'https://api.alternative.me/fng/',
    coinGecko: 'https://api.coingecko.com/api/v3'
};