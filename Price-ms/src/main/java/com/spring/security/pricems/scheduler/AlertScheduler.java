package com.spring.security.pricems.scheduler;

import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.enums.TargetSide;
import com.spring.security.pricems.repository.AlertRepository;
import com.spring.security.pricems.service.PriceService;
import com.spring.security.pricems.service.TelegramService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final PriceService priceService;
    private final TelegramService telegramService;


    @Scheduled(fixedDelayString = "${pricing.scheduler.alert-check-fixed-delay-ms:30000}")
    public void checkAlerts() {
        int size = 500;

        while (true) {
            Page<PriceAlert> alertPage = alertRepository.findAllByIsTriggeredFalse(PageRequest.of(0, size));
            List<PriceAlert> alerts = alertPage.getContent();

            if (alerts.isEmpty()) {
                break;
            }

            Map<String, List<PriceAlert>> grouped = alerts.stream()
                    .collect(Collectors.groupingBy(PriceAlert::getSymbol));

            Map<String, Double> currentPrices = priceService.getRealtimePriceMap(new ArrayList<>(grouped.keySet()));
            List<PriceAlert> triggered = new ArrayList<>();

            for (var entry : grouped.entrySet()) {
                String symbol = entry.getKey();
                Double currentPrice = currentPrices.get(symbol);

                if (currentPrice == null) continue;

                for (PriceAlert alert : entry.getValue()) {
                    boolean isHit = alert.getSide() == TargetSide.UP
                            ? currentPrice >= alert.getTargetPrice()
                            : currentPrice <= alert.getTargetPrice();

                    if (isHit) {
                        telegramService.sendAlert(alert.getChatId(), "Alert triggered: " + symbol);
                        alert.setTriggered(true);
                        triggered.add(alert);
                    }
                }
            }

            if (!triggered.isEmpty()) {
                alertRepository.saveAll(triggered);
            }
        }
    }
}