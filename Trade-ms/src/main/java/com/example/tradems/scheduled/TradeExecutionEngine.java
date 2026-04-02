package com.example.tradems.scheduled;

import com.example.tradems.client.PriceClient;
import com.example.tradems.enums.TradeStatus;
import com.example.tradems.model.TradeEntity;
import com.example.tradems.repository.TradeRepository;
import com.example.tradems.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class TradeExecutionEngine {

    private final TradeRepository tradeRepository;
    private final PriceClient priceClient;
    private final TradeService tradeService;

    @Scheduled(fixedDelayString = "${trading.engine.fixed-delay:1000}")
    public void runEngine() {
        List<TradeEntity> pendingTrades = tradeRepository.findAllByStatus(TradeStatus.PENDING);
        List<TradeEntity> openTrades = tradeRepository.findAllByStatus(TradeStatus.OPEN);

        if (pendingTrades.isEmpty() && openTrades.isEmpty()) return;

        // 1. DDOS HƏLLİ: Saniyədə minlərlə request atmaq əvəzinə
        // Unikal coin adlarını tapırıq
        Set<String> uniqueSymbols = new HashSet<>();
        pendingTrades.forEach(t -> uniqueSymbols.add(t.getSymbol()));
        openTrades.forEach(t -> uniqueSymbols.add(t.getSymbol()));

        // 2. Yalnız o coinlər üçün qiymətləri ÇƏK VƏ CACHE-LƏ (Yaddaşa al)
        Map<String, BigDecimal> currentPrices = new HashMap<>();
        for (String symbol : uniqueSymbols) {
            currentPrices.put(symbol, getCurrentPrice(symbol));
        }

        // 3. AOP TRANSACTIONAL HƏLLİ: Metodları Engine-dən yox, Service-dən çağırırıq
        for (TradeEntity trade : pendingTrades) {
            BigDecimal price = currentPrices.get(trade.getSymbol());
            if (price.compareTo(BigDecimal.ZERO) > 0) {
                // Ticarəti TradeService üzərindən icra edirik ki, məlumatlar kilidlənsin (Lock)
                tradeService.tryToExecutePendingOrder(trade, price);
            }
        }

        for (TradeEntity trade : openTrades) {
            BigDecimal price = currentPrices.get(trade.getSymbol());
            if (price.compareTo(BigDecimal.ZERO) > 0) {
                // Pozisiyanı TradeService üzərindən yoxlayıb bağlayırıq
                tradeService.checkAndClosePosition(trade, price);
            }
        }
    }

    private BigDecimal getCurrentPrice(String symbol) {
        try {
            Double rawPrice = priceClient.getRealtimePrice(symbol);
            if (rawPrice == null || rawPrice <= 0) {
                return BigDecimal.ZERO;
            }
            return BigDecimal.valueOf(rawPrice);
        } catch (Exception e) {
            log.error("Qiymət oxunarkən xəta ({}): {}", symbol, e.getMessage());
            return BigDecimal.ZERO;
        }
    }
}