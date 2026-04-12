package com.spring.security.pricems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class BinanceService {

    private static final String EXCHANGE_INFO_PATH = "/exchangeInfo";

    private final RestTemplate restTemplate;

    @Value("${binance.api.url}")
    private String binanceApiUrl;

    private volatile Set<String> validSymbols = ConcurrentHashMap.newKeySet();

    public boolean isValidSymbol(String symbol) {
        String upperSymbol = normalizeSymbol(symbol);
        if (upperSymbol == null) {
            return false;
        }

        ensureSymbolsLoaded();
        return validSymbols.contains(upperSymbol);
    }

    public Set<String> filterValidSymbols(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Collections.emptySet();
        }

        ensureSymbolsLoaded();

        Set<String> result = new HashSet<>();
        for (String symbol : symbols) {
            String normalized = normalizeSymbol(symbol);
            if (normalized != null && validSymbols.contains(normalized)) {
                result.add(normalized);
            }
        }
        return result;
    }

    @Scheduled(fixedDelayString = "${binance.symbol-cache.refresh-ms:3600000}")
    public void refreshValidSymbols() {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(binanceApiUrl)
                    .path(EXCHANGE_INFO_PATH)
                    .build(true)
                    .toUri();

            ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> body = responseEntity.getBody();
            if (body == null) {
                log.warn("Binance exchangeInfo response body is null");
                return;
            }

            Object symbolsObject = body.get("symbols");
            if (!(symbolsObject instanceof List<?> symbolsList)) {
                log.warn("Binance exchangeInfo response does not contain a valid symbols list");
                return;
            }

            Set<String> refreshed = ConcurrentHashMap.newKeySet();
            for (Object item : symbolsList) {
                if (!(item instanceof Map<?, ?> rawMap)) {
                    continue;
                }

                Object symbolValue = rawMap.get("symbol");
                Object statusValue = rawMap.get("status");
                if (symbolValue == null) {
                    continue;
                }

                String symbol = String.valueOf(symbolValue).trim().toUpperCase();
                String status = statusValue == null ? null : String.valueOf(statusValue).trim().toUpperCase();

                if (!symbol.isBlank() && (status == null || Objects.equals(status, "TRADING"))) {
                    refreshed.add(symbol);
                }
            }

            if (!refreshed.isEmpty()) {
                validSymbols = refreshed;
                log.info("Loaded {} valid Binance symbols into local cache", refreshed.size());
            } else {
                log.warn("Binance exchangeInfo refresh completed but produced an empty symbol set");
            }
        } catch (RestClientException e) {
            log.error("Failed to refresh Binance symbol cache: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error while refreshing Binance symbol cache: {}", e.getMessage(), e);
        }
    }

    private void ensureSymbolsLoaded() {
        if (!validSymbols.isEmpty()) {
            return;
        }

        synchronized (this) {
            if (validSymbols.isEmpty()) {
                refreshValidSymbols();
            }
        }
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null) {
            return null;
        }

        String normalized = symbol.trim().toUpperCase();
        return normalized.isBlank() ? null : normalized;
    }
}