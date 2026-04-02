const normalizeBaseUrl = (value = '') => value.replace(/\/+$/, '');

export const GATEWAY_URL = normalizeBaseUrl(process.env.REACT_APP_GATEWAY_URL || '');

export const API_BASES = {
    crypto: `${GATEWAY_URL}/api/crypto`,
    user: `${GATEWAY_URL}/api/user`,
    admin: `${GATEWAY_URL}/api/admin`,
    users: `${GATEWAY_URL}/api/users`,
    trades: `${GATEWAY_URL}/api/trades/user`,
    withdraw: `${GATEWAY_URL}/api/withdraw`,
    analysis: `${GATEWAY_URL}/analysis`,
    news: `${GATEWAY_URL}/api/news`,
    market: `${GATEWAY_URL}/api/market`
};

export const EXTERNAL_APIS = {
    binance: 'https://api.binance.com',
    binanceFutures: 'https://fapi.binance.com',
    fearGreed: 'https://api.alternative.me/fng/',
    coinGecko: 'https://api.coingecko.com/api/v3'
};
