package com.spring.security.pricems.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.security.pricems.dao.dto.response.PriceResponse;
import com.spring.security.pricems.dao.dto.response.WatchlistPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceService {

    private static final String REDIS_PRICE_PREFIX = "PRICE_";
    private static final String REDIS_24H_PREFIX = "PRICE_24H_";
    private static final long PRICE_CACHE_SECONDS = 2L;
    private static final long BATCH_CACHE_SECONDS = 10L;

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${binance.api.url}")
    private String binanceApiUrl;

    public Double getRealtimePrice(String symbol) {
        String upperSymbol = normalizeSymbol(symbol);
        String redisKey = REDIS_PRICE_PREFIX + upperSymbol;

        try {
            String cachedPrice = redisTemplate.opsForValue().get(redisKey);
            if (cachedPrice != null && !cachedPrice.isBlank()) {
                return Double.parseDouble(cachedPrice);
            }
        } catch (Exception e) {
            log.warn("Redis read failed for {}: {}", upperSymbol, e.getMessage());
        }

        try {
            String requestUrl = binanceApiUrl + "/ticker/price?symbol={symbol}";
            Map<String, String> response = restTemplate.getForObject(requestUrl, Map.class, upperSymbol);

            if (response != null && response.containsKey("price")) {
                Double realPrice = Double.parseDouble(response.get("price"));
                safeSet(redisKey, String.valueOf(realPrice), PRICE_CACHE_SECONDS);
                return realPrice;
            }
        } catch (RestClientException e) {
            log.error("Binance realtime price request failed for {}: {}", upperSymbol, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected realtime price error for {}: {}", upperSymbol, e.getMessage(), e);
        }

        return null;
    }

    public List<WatchlistPriceResponse> getWatchlistPrices(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Collections.emptyList();
        }

        return symbols.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeSymbol)
                .distinct()
                .map(symbol -> new WatchlistPriceResponse(symbol, getRealtimePrice(symbol)))
                .toList();
    }

    public List<PriceResponse> getBatchPrices(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> upperSymbols = symbols.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeSymbol)
                .distinct()
                .limit(50)
                .toList();

        List<PriceResponse> results = new ArrayList<>();
        List<String> missingFromCache = new ArrayList<>();

        for (String sym : upperSymbols) {
            String redisKey = REDIS_24H_PREFIX + sym;
            try {
                String cachedJson = redisTemplate.opsForValue().get(redisKey);
                if (cachedJson != null && !cachedJson.isBlank()) {
                    results.add(objectMapper.readValue(cachedJson, PriceResponse.class));
                    continue;
                }
            } catch (Exception e) {
                log.warn("Failed to read batch cache for {}: {}", sym, e.getMessage());
            }

            missingFromCache.add(sym);
        }

        if (!missingFromCache.isEmpty()) {
            List<PriceResponse> fetched = fetch24HourBatch(missingFromCache);
            results.addAll(fetched);
        }

        Map<String, PriceResponse> bySymbol = results.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        PriceResponse::getSymbol,
                        p -> p,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        return upperSymbols.stream()
                .map(bySymbol::get)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<PriceResponse> fetch24HourBatch(List<String> symbols) {
        try {
            String joinedSymbols = symbols.stream()
                    .map(s -> "\"" + s + "\"")
                    .collect(Collectors.joining(",", "[", "]"));

            String url = binanceApiUrl + "/ticker/24hr?symbols=" + joinedSymbols;
            List<Map<String, Object>> response = restTemplate.getForObject(url, List.class);

            if (response == null || response.isEmpty()) {
                return Collections.emptyList();
            }

            List<PriceResponse> fetched = new ArrayList<>();

            for (Map<String, Object> item : response) {
                PriceResponse pr = mapToPriceResponse(item);
                if (pr != null) {
                    fetched.add(pr);
                    try {
                        safeSet(REDIS_24H_PREFIX + pr.getSymbol(), objectMapper.writeValueAsString(pr), BATCH_CACHE_SECONDS);
                    } catch (Exception e) {
                        log.warn("Failed to cache batch price for {}: {}", pr.getSymbol(), e.getMessage());
                    }
                }
            }

            return fetched;
        } catch (RestClientException e) {
            log.error("Binance 24hr batch request failed: {}", e.getMessage());
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Unexpected batch price error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    private PriceResponse mapToPriceResponse(Map<String, Object> item) {
        try {
            PriceResponse pr = new PriceResponse();
            pr.setSymbol(String.valueOf(item.get("symbol")));
            pr.setPrice(new BigDecimal(String.valueOf(item.get("lastPrice"))));
            pr.setChange(new BigDecimal(String.valueOf(item.get("priceChangePercent"))));
            pr.setHigh(new BigDecimal(String.valueOf(item.get("highPrice"))));
            pr.setLow(new BigDecimal(String.valueOf(item.get("lowPrice"))));
            pr.setVolume(new BigDecimal(String.valueOf(item.get("quoteVolume"))));
            pr.setBaseVolume(new BigDecimal(String.valueOf(item.get("volume"))));
            pr.setVwap(new BigDecimal(String.valueOf(item.get("weightedAvgPrice"))));
            pr.setPriceChangeAmt(new BigDecimal(String.valueOf(item.get("priceChange"))));
            return pr;
        } catch (Exception e) {
            log.warn("Failed to map Binance 24hr item: {}", e.getMessage());
            return null;
        }
    }

    private void safeSet(String key, String value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis write failed for key {}: {}", key, e.getMessage());
        }
    }

    private String normalizeSymbol(String symbol) {
        return symbol.trim().toUpperCase();
    }
}