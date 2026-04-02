package com.example.tradems.service;

import com.example.tradems.client.PriceClient;
import com.example.tradems.dto.request.OpenTradeRequest;
import com.example.tradems.dto.response.OpenTradeResponse;
import com.example.tradems.dto.response.PendingTradeResponse;
import com.example.tradems.dto.response.TradeHistoryResponse;
import com.example.tradems.enums.ContestStatus;
import com.example.tradems.enums.PositionSide;
import com.example.tradems.enums.TradeStatus;
import com.example.tradems.exception.InsufficientFundsException;
import com.example.tradems.exception.InvalidTradeParameterException;
import com.example.tradems.exception.UserNotFoundException;
import com.example.tradems.model.ContestEntity;
import com.example.tradems.model.TradeEntity;
import com.example.tradems.model.UserEntity;
import com.example.tradems.repository.ContestRepository;
import com.example.tradems.repository.TradeRepository;
import com.example.tradems.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeService {

    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final PriceClient priceClient;
    private final ContestRepository contestRepository;

    private void validateContestIsActive(UserEntity user) {
        ContestEntity contest = contestRepository.findFirstByStatus(ContestStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aktiv yarışma tapılmadı!"));

        if (!contest.getCurrentMonth().equals(user.getLastJoinedMonth())) {
            throw new RuntimeException("Siz bu ayki yarışmaya qeydiyyatdan keçməmisiniz! Qeydiyyat vaxtını gözləyin.");
        }
    }

    @Transactional
    public TradeEntity openTrade(OpenTradeRequest request) {
        // 1. ŞƏBƏKƏ SORĞUSUNU LOKDAN ƏVVƏLƏ KEÇİRİRİK (DB bloklanmır!)
        BigDecimal currentMarketPrice = getRealtimePrice(request.symbol());
        if (currentMarketPrice == null || currentMarketPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Qiymət servisi aktiv deyil, əməliyyat icra oluna bilməz.");
        }

        // 2. YALNIZ QİYMƏT ALINDIQDAN SONRA İSTİFADƏÇİNİ LOCK EDİRİK
        UserEntity user = userRepository.findByIdWithLock(request.userId())
                .orElseThrow(() ->  new UserNotFoundException("İstifadəçi tapılmadı"));

        validateContestIsActive(user);
        validateUserAndMargin(user, request.margin(), request.leverage());

        BigDecimal entryPrice;
        TradeStatus status;

        // 3. Limit (PENDING) yoxsa Market (OPEN) olduğunu müəyyən edirik
        if (request.targetPrice() != null && request.targetPrice().compareTo(BigDecimal.ZERO) > 0) {
            if (request.side() == PositionSide.LONG && currentMarketPrice.compareTo(request.targetPrice()) <= 0) {
                throw new InvalidTradeParameterException("Long Limit qiyməti cari bazar qiymətindən (" + currentMarketPrice + ") aşağı olmalıdır.");
            }
            if (request.side() == PositionSide.SHORT && currentMarketPrice.compareTo(request.targetPrice()) >= 0) {
                throw new InvalidTradeParameterException("Short Limit qiyməti cari bazar qiymətindən (" + currentMarketPrice + ") yuxarı olmalıdır.");
            }
            entryPrice = request.targetPrice();
            status = TradeStatus.PENDING;
        } else {
            entryPrice = currentMarketPrice;
            status = TradeStatus.OPEN;
        }

        validateTPSL(request.side(), entryPrice, request.takeProfit(), request.stopLoss());
        updateUserBalanceForOpening(user, request.margin(), status);

        TradeEntity trade = createTradeEntity(request, entryPrice, status, user);

        userRepository.save(user);
        return tradeRepository.save(trade);
    }

    public List<OpenTradeResponse> getActiveTrades(Long userId) {
        return tradeRepository.findByUser_IdAndStatus(userId, TradeStatus.OPEN)
                .stream()
                .map(this::mapToOpenTradeResponse)
                .toList();
    }

    public List<PendingTradeResponse> getUserPendingOrders(Long userId) {
        return tradeRepository.findByUser_IdAndStatus(userId, TradeStatus.PENDING)
                .stream()
                .map(t -> new PendingTradeResponse(
                        t.getId(), t.getSymbol(), t.getSide(),
                        t.getEntryPrice(), t.getMargin(), t.getLeverage()
                )).toList();
    }

    @Transactional
    public void cancelPendingTrade(UUID tradeId, Long userId) {
        TradeEntity trade = findTradeByIdAndValidateUser(tradeId, userId); // YENİ
        validateContestIsActive(trade.getUser());
        executeCancel(trade);
    }

    @Transactional
    public void closeTradeManually(UUID tradeId, Long userId) {
        TradeEntity trade = findTradeByIdAndValidateUser(tradeId, userId); // YENİ
        validateContestIsActive(trade.getUser());
        executeClose(trade, false);
    }
    @Transactional
    public void updateTradeTPSL(UUID tradeId, BigDecimal tpPrice, BigDecimal slPrice, Long userId) {
        TradeEntity trade = findTradeByIdAndValidateUser(tradeId, userId);

        // ƏLAVƏ EDİLDİ: Status yoxlaması
        if (trade.getStatus() == TradeStatus.CLOSED || trade.getStatus() == TradeStatus.LIQUIDATED || trade.getStatus() == TradeStatus.CANCELLED) {
            throw new RuntimeException("Bağlanmış və ya ləğv edilmiş pozisiyalara TP/SL qoyula bilməz!");
        }

        validateContestIsActive(trade.getUser());

        validateTPSL(trade.getSide(), trade.getEntryPrice(), tpPrice, slPrice);

        trade.setTakeProfit((tpPrice != null && tpPrice.compareTo(BigDecimal.ZERO) > 0) ? tpPrice : null);
        trade.setStopLoss((slPrice != null && slPrice.compareTo(BigDecimal.ZERO) > 0) ? slPrice : null);

        tradeRepository.save(trade);
    }

    @Transactional
    public void forceCloseAllTrades() {
        log.info("AY SONU: Bütün açıq pozisiyalar və gözləyən sifarişlər ləğv edilir!");

        List<TradeEntity> openTrades = tradeRepository.findAllByStatus(TradeStatus.OPEN);
        for (TradeEntity trade : openTrades) {
            try {
                executeClose(trade, true); // Məcburidir
            } catch (Exception e) {
                log.error("Force Close xətası (ID: {}): {}", trade.getId(), e.getMessage());
            }
        }

        List<TradeEntity> pendingTrades = tradeRepository.findAllByStatus(TradeStatus.PENDING);
        for (TradeEntity trade : pendingTrades) {
            try {
                executeCancel(trade);
            } catch (Exception e) {
                log.error("Force Cancel xətası (ID: {}): {}", trade.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    public void tryToExecutePendingOrder(TradeEntity trade, BigDecimal currentPrice) {
        try {
            if (isTargetPriceHit(trade, currentPrice)) {
                activateOrder(trade);
            }
        } catch (Exception e) {
            log.error("Pending trade aktivləşdirilərkən xəta (ID: {}): {}", trade.getId(), e.getMessage());
        }
    }

    @Transactional
    public void checkAndClosePosition(TradeEntity trade, BigDecimal currentPrice) {
        try {
            if (isLiquidationHit(trade, currentPrice)) {
                finalizePosition(trade, currentPrice, "LIQUIDATED");
            } else if (isStopLossHit(trade, currentPrice)) {
                finalizePosition(trade, currentPrice, "STOP_LOSS");
            } else if (isTakeProfitHit(trade, currentPrice)) {
                finalizePosition(trade, currentPrice, "TAKE_PROFIT");
            }
        } catch (Exception e) {
            log.error("Pozisiya yoxlanarkən xəta (ID: {}): {}", trade.getId(), e.getMessage());
        }
    }

    private void activateOrder(TradeEntity trade) {
        UserEntity user = userRepository.findByIdWithLock(trade.getUser().getId())
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));

        user.setFrozenBalance(safeGet(user.getFrozenBalance()).subtract(trade.getMargin()));

        trade.setStatus(TradeStatus.OPEN);
        trade.setOpenTime(LocalDateTime.now());

        userRepository.save(user);
        tradeRepository.save(trade);
        log.info("Limit order aktivləşdi: {} {} @ {}", trade.getSymbol(), trade.getSide(), trade.getEntryPrice());
    }

    private void finalizePosition(TradeEntity trade, BigDecimal exitPrice, String reason) {
        UserEntity user = userRepository.findByIdWithLock(trade.getUser().getId())
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));

        BigDecimal pnlValue = calculateInstantPnL(trade, exitPrice);
        BigDecimal payout = trade.getMargin().add(pnlValue).max(BigDecimal.ZERO);

        user.setVirtualBalance(safeGet(user.getVirtualBalance()).add(payout));

        trade.setStatus("LIQUIDATED".equals(reason) ? TradeStatus.LIQUIDATED : TradeStatus.CLOSED);
        trade.setClosePrice(exitPrice);
        trade.setCloseTime(LocalDateTime.now());
        trade.setPnl(pnlValue);

        userRepository.save(user);
        tradeRepository.save(trade);
        log.info("Pozisiya bağlandı ({}): {} PnL: {}", reason, trade.getId(), pnlValue);
    }

    private void executeCancel(TradeEntity trade) {
        validateStatus(trade, TradeStatus.PENDING, "Yalnız gözləyən sifarişlər ləğv edilə bilər");

        UserEntity user = userRepository.findByIdWithLock(trade.getUser().getId())
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        restoreBalance(user, trade.getMargin());

        trade.setStatus(TradeStatus.CANCELLED);
        trade.setCloseTime(LocalDateTime.now());

        userRepository.save(user);
        tradeRepository.save(trade);
    }

    private void executeClose(TradeEntity trade, boolean isForce) {
        validateStatus(trade, TradeStatus.OPEN, "Yalnız aktiv pozisiyalar bağlana bilər");

        // 1. ŞƏBƏKƏ SORĞUSUNU (QİYMƏTİ) LOKDAN ƏVVƏL ALIRIQ
        BigDecimal closePrice = getRealtimePrice(trade.getSymbol());

        if (closePrice == null || closePrice.compareTo(BigDecimal.ZERO) <= 0) {
            if (isForce) {
                log.warn("Cari qiymət alınmadı! Trade (ID: {}) məcburi Entry Price ilə bağlanır.", trade.getId());
                closePrice = trade.getEntryPrice();
            } else {
                throw new RuntimeException("Canlı bazar qiyməti alına bilmir, zəhmət olmasa bir az sonra təkrar cəhd edin.");
            }
        }

        // 2. QİYMƏTİ ALANDAN SONRA İSTİFADƏÇİNİ LOCK EDİB BALANSI YENİLƏYİRİK
        UserEntity user = userRepository.findByIdWithLock(trade.getUser().getId())
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        BigDecimal pnl = calculateInstantPnL(trade, closePrice);
        BigDecimal payout = trade.getMargin().add(pnl).max(BigDecimal.ZERO);

        user.setVirtualBalance(safeGet(user.getVirtualBalance()).add(payout));

        finalizeTrade(trade, TradeStatus.CLOSED, closePrice, pnl);

        userRepository.save(user);
        tradeRepository.save(trade);
    }


    private void updateUserBalanceForOpening(UserEntity user, BigDecimal margin, TradeStatus status) {
        BigDecimal currentBalance = safeGet(user.getVirtualBalance());
        user.setVirtualBalance(currentBalance.subtract(margin));

        if (status == TradeStatus.PENDING) {
            BigDecimal currentFrozen = safeGet(user.getFrozenBalance());
            user.setFrozenBalance(currentFrozen.add(margin));
        }
    }

    private void restoreBalance(UserEntity user, BigDecimal margin) {
        BigDecimal currentFrozen = safeGet(user.getFrozenBalance());
        BigDecimal currentVirtual = safeGet(user.getVirtualBalance());

        user.setFrozenBalance(currentFrozen.subtract(margin));
        user.setVirtualBalance(currentVirtual.add(margin));
    }

    private void finalizeTrade(TradeEntity trade, TradeStatus status, BigDecimal closePrice, BigDecimal pnl) {
        trade.setStatus(status);
        trade.setClosePrice(closePrice);
        trade.setPnl(pnl);
        trade.setCloseTime(LocalDateTime.now());
    }

    private BigDecimal calculateInstantPnL(TradeEntity trade, BigDecimal currentPrice) {
        if (trade.getEntryPrice() == null || trade.getEntryPrice().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal diff = (trade.getSide() == PositionSide.LONG)
                ? currentPrice.subtract(trade.getEntryPrice())
                : trade.getEntryPrice().subtract(currentPrice);

        BigDecimal pnl = diff.divide(trade.getEntryPrice(), 8, RoundingMode.HALF_UP)
                .multiply(trade.getMargin())
                .multiply(new BigDecimal(trade.getLeverage()));

        if (pnl.compareTo(trade.getMargin().negate()) < 0) {
            pnl = trade.getMargin().negate();
        }

        return pnl;
    }

    private BigDecimal getRealtimePrice(String symbol) {
        try {
            Double rawPrice = priceClient.getRealtimePrice(symbol);

            if (rawPrice == null || rawPrice <= 0) {
                log.warn("Qiymət servisi {} üçün etibarsız qiymət qaytardı: {}", symbol, rawPrice);
                return BigDecimal.ZERO;
            }

            return BigDecimal.valueOf(rawPrice);

        } catch (Exception e) {
            log.error("Qiymət oxunarkən xəta ({}): {}", symbol, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    private OpenTradeResponse mapToOpenTradeResponse(TradeEntity trade) {
        BigDecimal current = getRealtimePrice(trade.getSymbol());

        BigDecimal priceToUse = (current == null || current.compareTo(BigDecimal.ZERO) <= 0)
                ? trade.getEntryPrice()
                : current;

        BigDecimal pnl = calculateInstantPnL(trade, priceToUse);

        BigDecimal pnlPerc = BigDecimal.ZERO;
        if (trade.getMargin() != null && trade.getMargin().compareTo(BigDecimal.ZERO) > 0) {
            pnlPerc = pnl.divide(trade.getMargin(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }

        return new OpenTradeResponse(
                trade.getId(),
                trade.getSymbol(),
                trade.getSide(),
                trade.getEntryPrice(),
                priceToUse,
                trade.getMargin(),
                trade.getLeverage(),
                pnl,
                pnlPerc,
                trade.getTakeProfit(),
                trade.getStopLoss(),
                trade.getLiquidationPrice()
        );
    }

    private TradeEntity createTradeEntity(OpenTradeRequest req, BigDecimal entry, TradeStatus status, UserEntity user) {
        TradeEntity trade = new TradeEntity();

        trade.setUser(user);
        trade.setSymbol(req.symbol().toUpperCase());
        trade.setSide(req.side());
        trade.setMargin(req.margin());
        trade.setLeverage(req.leverage());
        trade.setEntryPrice(entry);

        // BUG FİX: TP/SL 0 göndəriləndə Engine xəta verməməsi üçün NULL yazılır
        trade.setTakeProfit((req.takeProfit() != null && req.takeProfit().compareTo(BigDecimal.ZERO) > 0) ? req.takeProfit() : null);
        trade.setStopLoss((req.stopLoss() != null && req.stopLoss().compareTo(BigDecimal.ZERO) > 0) ? req.stopLoss() : null);

        trade.setLiquidationPrice(calculateLiquidationPrice(entry, req.leverage(), req.side()));
        trade.setStatus(status);
        trade.setOpenTime(LocalDateTime.now());
        trade.setPnl(BigDecimal.ZERO);

        return trade;
    }

    private void validateUserAndMargin(UserEntity user, BigDecimal margin, int leverage) {
        // BUG FİX: Leverage uyğunsuzluğu UI ilə sinxronlaşdırıldı (artıq 100x dəstəklənir)
        if (leverage < 1 || leverage > 100) throw new InvalidTradeParameterException("Leverage xətası (1x-100x)");
        if (margin.compareTo(new BigDecimal("10")) < 0) throw new InsufficientFundsException("Minimum margin 10 USDT");

        if (safeGet(user.getVirtualBalance()).compareTo(margin) < 0) {
            throw new InsufficientFundsException("Balans yetərsiz");
        }
    }

    private void validateTargetPrice(BigDecimal targetPrice) {
        if (targetPrice != null && targetPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTradeParameterException("Target price 0-dan böyük olmalıdır");
        }
    }

    private void validateTPSL(PositionSide side, BigDecimal entry, BigDecimal tp, BigDecimal sl) {
        // BUG FİX: TP və ya SL-in `0` göndərilib silinmə ehtimalını pass keçirik.
        boolean hasTp = tp != null && tp.compareTo(BigDecimal.ZERO) > 0;
        boolean hasSl = sl != null && sl.compareTo(BigDecimal.ZERO) > 0;

        if (side == PositionSide.LONG) {
            if (hasTp && tp.compareTo(entry) <= 0) throw new InvalidTradeParameterException("TP girişdən yuxarı olmalıdır");
            if (hasSl && sl.compareTo(entry) >= 0) throw new InvalidTradeParameterException("SL girişdən aşağı olmalıdır");
        } else {
            if (hasTp && tp.compareTo(entry) >= 0) throw new InvalidTradeParameterException("TP girişdən aşağı olmalıdır");
            if (hasSl && sl.compareTo(entry) <= 0) throw new InvalidTradeParameterException("SL girişdən yuxarı olmalıdır");
        }
    }

    private BigDecimal calculateLiquidationPrice(BigDecimal entry, int leverage, PositionSide side) {
        BigDecimal factor = BigDecimal.ONE.divide(new BigDecimal(leverage), 8, RoundingMode.HALF_UP);
        BigDecimal maintenance = new BigDecimal("0.005");
        return (side == PositionSide.LONG)
                ? entry.multiply(BigDecimal.ONE.subtract(factor).add(maintenance)).setScale(4, RoundingMode.HALF_UP)
                : entry.multiply(BigDecimal.ONE.add(factor).subtract(maintenance)).setScale(4, RoundingMode.HALF_UP);
    }

    private TradeEntity findTradeById(UUID id) {
        return tradeRepository.findById(id).orElseThrow(() -> new RuntimeException("Trade tapılmadı"));
    }

    private void validateStatus(TradeEntity trade, TradeStatus expected, String msg) {
        if (trade.getStatus() != expected) throw new RuntimeException(msg);
    }

    private BigDecimal safeGet(BigDecimal val) {
        return val == null ? BigDecimal.ZERO : val;
    }

    private boolean isTargetPriceHit(TradeEntity t, BigDecimal price) {
        return (t.getSide() == PositionSide.LONG) ? price.compareTo(t.getEntryPrice()) <= 0
                : price.compareTo(t.getEntryPrice()) >= 0;
    }

    private boolean isTakeProfitHit(TradeEntity t, BigDecimal price) {
        if (t.getTakeProfit() == null) return false;
        return (t.getSide() == PositionSide.LONG) ? price.compareTo(t.getTakeProfit()) >= 0
                : price.compareTo(t.getTakeProfit()) <= 0;
    }

    private boolean isStopLossHit(TradeEntity t, BigDecimal price) {
        if (t.getStopLoss() == null) return false;
        return (t.getSide() == PositionSide.LONG) ? price.compareTo(t.getStopLoss()) <= 0
                : price.compareTo(t.getStopLoss()) >= 0;
    }

    private boolean isLiquidationHit(TradeEntity t, BigDecimal price) {
        return (t.getSide() == PositionSide.LONG) ? price.compareTo(t.getLiquidationPrice()) <= 0
                : price.compareTo(t.getLiquidationPrice()) >= 0;
    }

    public List<TradeHistoryResponse> getUserTradeHistory(Long userId) {
        List<TradeStatus> closedStatuses = List.of(TradeStatus.CLOSED, TradeStatus.LIQUIDATED);

        return tradeRepository.findByUser_IdAndStatusInOrderByCloseTimeDesc(userId, closedStatuses)
                .stream()
                .limit(50)
                .map(t -> new TradeHistoryResponse(
                        t.getSymbol(), t.getSide(), t.getEntryPrice(),
                        t.getClosePrice(), t.getMargin(), t.getLeverage(),
                        t.getPnl(), t.getStatus(), t.getCloseTime()
                ))
                .toList();
    }

    @Transactional
    public void adminForceCloseTrade(UUID tradeId) {
        TradeEntity trade = findTradeById(tradeId);
        executeClose(trade, true); // Məcburidir
    }

    @Transactional
    public void adminForceCancelTrade(UUID tradeId) {
        TradeEntity trade = findTradeById(tradeId);
        executeCancel(trade);
    }


    private TradeEntity findTradeByIdAndValidateUser(UUID tradeId, Long userId) {
        TradeEntity trade = findTradeById(tradeId);
        if (!trade.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bu əməliyyatı icra etmək üçün icazəniz yoxdur!");
        }
        return trade;
    }
}