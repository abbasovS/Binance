import { useCallback, useMemo, useState } from 'react';
import { tradeApi } from '../../../../api';

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const normalizeArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.content)) return payload.content;
    return [];
};

const getTradePnl = (trade) => {
    return toNumber(
        trade?.realizedPnl ??
        trade?.pnl ??
        trade?.profit ??
        trade?.netPnl ??
        0
    );
};

const getOpenTradePnl = (trade) => {
    return toNumber(
        trade?.unrealizedPnl ??
        trade?.floatingPnl ??
        trade?.currentPnl ??
        trade?.pnl ??
        0
    );
};

const getTradeExposure = (trade) => {
    return toNumber(
        trade?.margin ??
        trade?.usedMargin ??
        trade?.positionSize ??
        trade?.amount ??
        trade?.quantity ??
        0
    );
};

const getTradeDate = (trade) => {
    const raw =
        trade?.closeTime ||
        trade?.closedAt ||
        trade?.updatedAt ||
        trade?.createdAt ||
        trade?.openTime;

    if (!raw) return null;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMonthDays = (year, monthIndex) => {
    return new Date(year, monthIndex + 1, 0).getDate();
};

const buildCalendarDays = (tradeHistory) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const daysInMonth = getMonthDays(year, monthIndex);

    const firstDay = new Date(year, monthIndex, 1);
    let firstWeekday = firstDay.getDay();
    firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;

    const dailyMap = {};

    tradeHistory.forEach((trade) => {
        const tradeDate = getTradeDate(trade);
        if (!tradeDate) return;

        if (
            tradeDate.getFullYear() !== year ||
            tradeDate.getMonth() !== monthIndex
        ) {
            return;
        }

        const day = tradeDate.getDate();
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (!dailyMap[key]) {
            dailyMap[key] = {
                pnl: 0,
                tradesCount: 0,
            };
        }

        dailyMap[key].pnl += getTradePnl(trade);
        dailyMap[key].tradesCount += 1;
    });

    const days = [];

    for (let i = 0; i < firstWeekday; i += 1) {
        days.push({
            key: `empty-${i}`,
            isPlaceholder: true,
        });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isLocked = day <= 5 || day >= 28;
        const metrics = dailyMap[key] || { pnl: 0, tradesCount: 0 };

        days.push({
            key,
            day,
            isToday: day === now.getDate(),
            isLocked,
            isOpen: !isLocked,
            pnl: metrics.pnl,
            tradesCount: metrics.tradesCount,
            reason: isLocked
                ? day <= 5
                    ? 'Registration lock'
                    : 'Settlement lock'
                : 'Trading open',
            isPlaceholder: false,
            isRangeStart: day === 1 || day === 28,
            isRangeEnd: day === 5 || day === daysInMonth,
        });
    }

    return {
        year,
        monthIndex,
        monthLabel: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        days,
    };
};

export default function useWalletSummary() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [walletState, setWalletState] = useState({
        user: null,
        withdrawBalance: 0,
        tradeHistory: [],
        activeTrades: [],
        pendingTrades: [],
        updatedAt: null,
    });

    const fetchWalletSummary = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [
                currentUserRes,
                withdrawBalanceRes,
                tradeHistoryRes,
                activeTradesRes,
                pendingTradesRes,
            ] = await Promise.allSettled([
                tradeApi.getCurrentUser(),
                tradeApi.getWithdrawBalance(),
                tradeApi.getTradeHistory(),
                tradeApi.getActiveTrades(),
                tradeApi.getPendingTrades(),
            ]);

            const currentUserData =
                currentUserRes.status === 'fulfilled'
                    ? (currentUserRes.value?.data ?? null)
                    : null;

            const withdrawBalanceData =
                withdrawBalanceRes.status === 'fulfilled'
                    ? (withdrawBalanceRes.value?.data ?? 0)
                    : 0;

            const tradeHistoryData =
                tradeHistoryRes.status === 'fulfilled'
                    ? normalizeArray(tradeHistoryRes.value?.data ?? tradeHistoryRes.value)
                    : [];

            const activeTradesData =
                activeTradesRes.status === 'fulfilled'
                    ? normalizeArray(activeTradesRes.value?.data ?? activeTradesRes.value)
                    : [];

            const pendingTradesData =
                pendingTradesRes.status === 'fulfilled'
                    ? normalizeArray(pendingTradesRes.value?.data ?? pendingTradesRes.value)
                    : [];

            const allFailed =
                currentUserRes.status === 'rejected' &&
                withdrawBalanceRes.status === 'rejected' &&
                tradeHistoryRes.status === 'rejected' &&
                activeTradesRes.status === 'rejected' &&
                pendingTradesRes.status === 'rejected';

            if (allFailed) {
                throw new Error('Wallet data could not be loaded.');
            }

            setWalletState({
                user: currentUserData,
                withdrawBalance: toNumber(withdrawBalanceData),
                tradeHistory: tradeHistoryData,
                activeTrades: activeTradesData,
                pendingTrades: pendingTradesData,
                updatedAt: new Date().toISOString(),
            });
        } catch (err) {
            setError(err?.message || 'Failed to load wallet summary.');
        } finally {
            setLoading(false);
        }
    }, []);

    const summary = useMemo(() => {
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

        let totalRealizedPnl = 0;
        let weeklyPnl = 0;
        let monthlyPnl = 0;
        let wins = 0;

        walletState.tradeHistory.forEach((trade) => {
            const pnl = getTradePnl(trade);
            const tradeDate = getTradeDate(trade)?.getTime();

            totalRealizedPnl += pnl;
            if (pnl > 0) wins += 1;

            if (tradeDate && tradeDate >= weekAgo) weeklyPnl += pnl;
            if (tradeDate && tradeDate >= monthAgo) monthlyPnl += pnl;
        });

        const totalTrades = walletState.tradeHistory.length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

        const openPnl = walletState.activeTrades.reduce(
            (sum, trade) => sum + getOpenTradePnl(trade),
            0
        );

        const usedExposure = walletState.activeTrades.reduce(
            (sum, trade) => sum + getTradeExposure(trade),
            0
        );

        const balance = toNumber(
            walletState.user?.virtualBalance ??
            walletState.user?.balance ??
            walletState.user?.walletBalance ??
            0
        );

        const calendar = buildCalendarDays(walletState.tradeHistory);

        return {
            balance,
            withdrawable: walletState.withdrawBalance,
            totalRealizedPnl,
            weeklyPnl,
            monthlyPnl,
            winRate,
            totalTrades,
            activeTradesCount: walletState.activeTrades.length,
            pendingTradesCount: walletState.pendingTrades.length,
            openPnl,
            usedExposure,
            updatedAt: walletState.updatedAt,
            calendar,
        };
    }, [walletState]);

    return {
        loading,
        error,
        refetch: fetchWalletSummary,
        summary,
    };
}