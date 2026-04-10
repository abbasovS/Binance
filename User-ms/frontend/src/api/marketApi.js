import { EXTERNAL_APIS, API_BASES } from './config';
import { apiAxios } from './httpClient';

export const marketApi = {
    getExchangeInfo: () => apiAxios.get(`${EXTERNAL_APIS.binance}/api/v3/exchangeInfo`),

    getTicker24h: () => apiAxios.get(`${API_BASES.market}/ticker/24hr`),

    getFuturesKlines: (symbol) =>
        apiAxios.get(`${EXTERNAL_APIS.binanceFutures}/fapi/v1/klines`, {
            params: { symbol: symbol.toUpperCase(), interval: '15m', limit: 40 }
        }),

    getFuturesDepth: (symbol) =>
        apiAxios.get(`${EXTERNAL_APIS.binanceFutures}/fapi/v1/depth`, {
            params: { symbol: symbol.toUpperCase(), limit: 1000 }
        }),

    getFearGreedIndex: () => apiAxios.get(EXTERNAL_APIS.fearGreed),

    getTopCoins: () =>
        apiAxios.get(`${EXTERNAL_APIS.coinGecko}/coins/markets`, {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 4,
                page: 1
            }
        })
};