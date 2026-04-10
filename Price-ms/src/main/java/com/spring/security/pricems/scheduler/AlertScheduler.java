package com.spring.security.pricems.scheduler;

import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.enums.TargetSide;
import com.spring.security.pricems.repository.AlertRepository;
import com.spring.security.pricems.repository.WatchListRepository;
import com.spring.security.pricems.service.PriceService;
import com.spring.security.pricems.service.TelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlertScheduler {

    private final AlertRepository alertRepository;
    private final WatchListRepository watchListRepository;
    private final PriceService priceService;
    private final TelegramService telegramService;

    @Scheduled(fixedDelayString = "${pricing.scheduler.refresh-fixed-delay-ms:10000}")
    public void monitorPrices() {
        List<String> symbols = watchListRepository.findDistinctSymbols();
        if (symbols.isEmpty()) {
            return;
        }

        for (String symbol : symbols) {
            try {
                priceService.getRealtimePrice(symbol);
            } catch (Exception e) {
                log.warn("Price refresh failed for {}: {}", symbol, e.getMessage());
            }
        }

        log.debug("Prices refreshed for {} symbols", symbols.size());
    }

    @Scheduled(fixedDelayString = "${pricing.scheduler.alert-check-fixed-delay-ms:30000}")
    public void checkAlerts() {
        List<PriceAlert> activeAlerts = alertRepository.findAllByIsTriggeredFalse();
        if (activeAlerts.isEmpty()) {
            return;
        }

        Map<String, List<PriceAlert>> alertsBySymbol = activeAlerts.stream()
                .collect(Collectors.groupingBy(PriceAlert::getSymbol));

        List<PriceAlert> triggeredAlerts = new ArrayList<>();

        for (Map.Entry<String, List<PriceAlert>> entry : alertsBySymbol.entrySet()) {
            String symbol = entry.getKey();
            Double currentPrice = priceService.getRealtimePrice(symbol);

            if (currentPrice == null) {
                log.warn("Alert check skipped. Current price unavailable for {}", symbol);
                continue;
            }

            for (PriceAlert alert : entry.getValue()) {
                try {
                    if (!isHit(alert, currentPrice)) {
                        continue;
                    }

                    String notification = String.format(
                            "🔔 Alert triggered\nSymbol: %s\nTarget: %.8f\nCurrent: %.8f\nDirection: %s",
                            symbol,
                            alert.getTargetPrice(),
                            currentPrice,
                            alert.getSide().name()
                    );

                    telegramService.sendAlert(alert.getChatId(), notification);
                    alert.setTriggered(true);
                    triggeredAlerts.add(alert);
                } catch (Exception e) {
                    log.error("Alert processing failed. alertId={}, symbol={}, error={}",
                            alert.getId(), symbol, e.getMessage(), e);
                }
            }
        }

        if (!triggeredAlerts.isEmpty()) {
            alertRepository.saveAll(triggeredAlerts);
            log.info("Triggered alerts saved. count={}", triggeredAlerts.size());
        }
    }

    private boolean isHit(PriceAlert alert, Double currentPrice) {
        return alert.getSide() == TargetSide.UP
                ? currentPrice >= alert.getTargetPrice()
                : currentPrice <= alert.getTargetPrice();
    }
}