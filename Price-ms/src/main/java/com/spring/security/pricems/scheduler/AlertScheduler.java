package com.spring.security.pricems.scheduler;
import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.repository.AlertRepository;
import com.spring.security.pricems.repository.WatchListRepository;
import com.spring.security.pricems.service.*;

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
    private final RedisService redisService;
    private final TelegramService telegramService;

    @Scheduled(fixedRate = 10000)
    public void monitorPrices() {
        List<String> symbols = watchListRepository.findDistinctSymbols();
        if (symbols.isEmpty()) return;

        for (String symbol : symbols) {
            priceService.getRealtimePrice(symbol); // Redis cache-i yeniləyir
        }
        log.debug("Prices refreshed for {} symbols", symbols.size());
    }

    @Scheduled(fixedRate = 30000)
    public void checkAlerts() {
        List<PriceAlert> activeAlerts = alertRepository.findAllByIsTriggeredFalse();
        if (activeAlerts.isEmpty()) return;

        // OPTİMALLAŞDIRMA: Alertləri simvollara görə qruplaşdırırıq (Məs: BTC üçün olan 50 alerti bir yerə yığırıq)
        Map<String, List<PriceAlert>> alertsBySymbol = activeAlerts.stream()
                .collect(Collectors.groupingBy(PriceAlert::getSymbol));

        List<PriceAlert> triggeredAlerts = new ArrayList<>();

        // Hər simvol üçün yalnız 1 DƏFƏ qiymət çəkirik
        for (Map.Entry<String, List<PriceAlert>> entry : alertsBySymbol.entrySet()) {
            String symbol = entry.getKey();
            Double currentPrice = priceService.getRealtimePrice(symbol);

            if (currentPrice == null) continue;

            // Həmin simvola aid olan bütün alertləri eyni qiymətlə yoxlayırıq
            for (PriceAlert alert : entry.getValue()) {
                if (isHit(alert, currentPrice)) {
                    String notification = String.format("🔔 ŞƏXSİ HƏDƏF: %s hədəfə çatdı! \nCari qiymət: %f",
                            symbol, currentPrice);

                    telegramService.sendAlert(notification); // (Gələcəkdə specific user-ə gedəcək)

                    alert.setTriggered(true);
                    triggeredAlerts.add(alert);
                }
            }
        }

        if (!triggeredAlerts.isEmpty()) {
            alertRepository.saveAll(triggeredAlerts);
        }
    }

    private boolean isHit(PriceAlert alert, Double currentPrice) {
        return "UP".equals(alert.getSide()) ? currentPrice >= alert.getTargetPrice() : currentPrice <= alert.getTargetPrice();
    }}