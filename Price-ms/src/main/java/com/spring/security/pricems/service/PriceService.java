package com.spring.security.pricems.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.security.pricems.dao.dto.response.PriceResponse;
import com.spring.security.pricems.dao.dto.response.WatchlistPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceService {

    private static final String REDIS_PRICE_PREFIX = "PRICE_";
    private static final String REDIS_24H_PREFIX = "PRICE_24H_";
    private static final long PRICE_CACHE_SECONDS = 5L;
    private static final long BATCH_CACHE_SECONDS = 15L;
    private static final int MAX_BATCH_SIZE = 50;
    private static final String REDIS_MARKET_TICKER_KEY = "MARKET_TICKER_24H";
    private static final long MARKET_TICKER_CACHE_SECONDS = 15L;

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final BinanceService binanceService;

    @Value("${binance.api.url}")
    private String binanceApiUrl;

    public Double getRealtimePrice(String symbol) {
        String upperSymbol = normalizeSymbol(symbol);
        if (upperSymbol == null) {
            return null;
        }

        Double cached = getCachedRealtimePrice(upperSymbol);
        if (cached != null) {
            return cached;
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(binanceApiUrl)
                    .path("/ticker/price")
                    .queryParam("symbol", upperSymbol)
                    .build(true)
                    .toUri();

            ResponseEntity<Map<String, String>> responseEntity = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, String>>() {}
            );

            Map<String, String> response = responseEntity.getBody();
            if (response != null && response.containsKey("price")) {
                Double realPrice = Double.parseDouble(response.get("price"));
                cacheRealtimePrice(upperSymbol, realPrice);
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
        List<String> upperSymbols = sanitizeSymbols(symbols);
        if (upperSymbols.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, Double> priceMap = getRealtimePriceMap(upperSymbols);

        return upperSymbols.stream()
                .map(symbol -> new WatchlistPriceResponse(symbol, priceMap.get(symbol)))
                .toList();
    }

    public List<PriceResponse> getBatchPrices(List<String> symbols) {
        List<String> upperSymbols = sanitizeSymbols(symbols);
        if (upperSymbols.isEmpty()) {
            return Collections.emptyList();
        }

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

    public Map<String, Double> getRealtimePriceMap(List<String> symbols) {
        List<String> upperSymbols = sanitizeSymbols(symbols);
        if (upperSymbols.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, Double> result = new LinkedHashMap<>();
        List<String> missing = new ArrayList<>();

        for (String symbol : upperSymbols) {
            Double cached = getCachedRealtimePrice(symbol);
            if (cached != null) {
                result.put(symbol, cached);
            } else {
                missing.add(symbol);
            }
        }

        if (!missing.isEmpty()) {
            Map<String, Double> fetched = fetchRealtimeBatch(missing);
            for (String symbol : missing) {
                if (fetched.containsKey(symbol)) {
                    result.put(symbol, fetched.get(symbol));
                }
            }
        }

        return result;
    }

    private Map<String, Double> fetchRealtimeBatch(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Collections.emptyMap();
        }

        List<String> validSymbols = symbols.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeSymbol)
                .filter(Objects::nonNull)
                .filter(binanceService::isValidSymbol)
                .distinct()
                .limit(MAX_BATCH_SIZE)
                .toList();

        if (validSymbols.isEmpty()) {
            return Collections.emptyMap();
        }

        try {
            String joinedSymbols = objectMapper.writeValueAsString(validSymbols);

            URI uri = UriComponentsBuilder.fromHttpUrl(binanceApiUrl)
                    .path("/ticker/price")
                    .queryParam("symbols", joinedSymbols)
                    .build()
                    .encode()
                    .toUri();

            ResponseEntity<List<Map<String, Object>>> responseEntity = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> response = responseEntity.getBody();
            if (response == null || response.isEmpty()) {
                return Collections.emptyMap();
            }

            Map<String, Double> fetched = new LinkedHashMap<>();

            for (Map<String, Object> item : response) {
                String symbol = asString(item.get("symbol"));
                String price = asString(item.get("price"));

                if (symbol == null || price == null) {
                    continue;
                }

                try {
                    Double parsedPrice = Double.parseDouble(price);
                    fetched.put(symbol, parsedPrice);
                    cacheRealtimePrice(symbol, parsedPrice);
                } catch (NumberFormatException e) {
                    log.warn("Failed to parse realtime batch price for {}: {}", symbol, price);
                }
            }

            return fetched;
        } catch (RestClientException e) {
            log.error("Binance realtime batch request failed: {}", e.getMessage(), e);
            return Collections.emptyMap();
        } catch (Exception e) {
            log.error("Unexpected realtime batch error: {}", e.getMessage(), e);
            return Collections.emptyMap();
        }
    }

    private List<PriceResponse> fetch24HourBatch(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> validSymbols = symbols.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeSymbol)
                .filter(Objects::nonNull)
                .filter(binanceService::isValidSymbol)
                .distinct()
                .limit(MAX_BATCH_SIZE)
                .toList();

        if (validSymbols.isEmpty()) {
            return Collections.emptyList();
        }

        try {
            String joinedSymbols = objectMapper.writeValueAsString(validSymbols);

            URI uri = UriComponentsBuilder.fromHttpUrl(binanceApiUrl)
                    .path("/ticker/24hr")
                    .queryParam("symbols", joinedSymbols)
                    .build()
                    .encode()
                    .toUri();

            ResponseEntity<List<Map<String, Object>>> responseEntity = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> response = responseEntity.getBody();
            if (response == null || response.isEmpty()) {
                return Collections.emptyList();
            }

            List<PriceResponse> fetched = new ArrayList<>();

            for (Map<String, Object> item : response) {
                PriceResponse pr = mapToPriceResponse(item);
                if (pr != null) {
                    fetched.add(pr);
                    try {
                        safeSet(
                                REDIS_24H_PREFIX + pr.getSymbol(),
                                objectMapper.writeValueAsString(pr),
                                BATCH_CACHE_SECONDS
                        );
                        cacheRealtimePrice(pr.getSymbol(), pr.getPrice().doubleValue());
                    } catch (Exception e) {
                        log.warn("Failed to cache batch price for {}: {}", pr.getSymbol(), e.getMessage());
                    }
                }
            }

            return fetched;
        } catch (RestClientException e) {
            log.error("Binance 24hr batch request failed: {}", e.getMessage(), e);
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Unexpected batch price error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    private PriceResponse mapToPriceResponse(Map<String, Object> item) {
        try {
            String symbol = normalizeSymbol(asString(item.get("symbol")));
            String lastPrice = asString(item.get("lastPrice"));
            String priceChangePercent = asString(item.get("priceChangePercent"));
            String highPrice = asString(item.get("highPrice"));
            String lowPrice = asString(item.get("lowPrice"));
            String quoteVolume = asString(item.get("quoteVolume"));
            String baseVolume = asString(item.get("volume"));
            String weightedAvgPrice = asString(item.get("weightedAvgPrice"));
            String priceChange = asString(item.get("priceChange"));

            if (symbol == null || lastPrice == null || priceChangePercent == null || highPrice == null ||
                    lowPrice == null || quoteVolume == null || baseVolume == null || weightedAvgPrice == null ||
                    priceChange == null) {
                return null;
            }

            PriceResponse pr = new PriceResponse();
            pr.setSymbol(symbol);
            pr.setPrice(new BigDecimal(lastPrice));
            pr.setChange(new BigDecimal(priceChangePercent));
            pr.setHigh(new BigDecimal(highPrice));
            pr.setLow(new BigDecimal(lowPrice));
            pr.setVolume(new BigDecimal(quoteVolume));
            pr.setBaseVolume(new BigDecimal(baseVolume));
            pr.setVwap(new BigDecimal(weightedAvgPrice));
            pr.setPriceChangeAmt(new BigDecimal(priceChange));
            return pr;
        } catch (Exception e) {
            log.warn("Failed to map Binance 24hr item: {}", e.getMessage());
            return null;
        }
    }

    private Double getCachedRealtimePrice(String symbol) {
        String redisKey = REDIS_PRICE_PREFIX + symbol;
        try {
            String cachedPrice = redisTemplate.opsForValue().get(redisKey);
            if (cachedPrice != null && !cachedPrice.isBlank()) {
                return Double.parseDouble(cachedPrice);
            }
        } catch (Exception e) {
            log.warn("Redis read failed for {}: {}", symbol, e.getMessage());
        }
        return null;
    }

    private void cacheRealtimePrice(String symbol, Double price) {
        if (symbol == null || price == null) {
            return;
        }
        safeSet(REDIS_PRICE_PREFIX + symbol, String.valueOf(price), PRICE_CACHE_SECONDS);
    }

    private void safeSet(String key, String value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis write failed for key {}: {}", key, e.getMessage());
        }
    }

    private List<String> sanitizeSymbols(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return Collections.emptyList();
        }

        return symbols.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeSymbol)
                .filter(Objects::nonNull)
                .distinct()
                .limit(MAX_BATCH_SIZE)
                .toList();
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null) {
            return null;
        }

        String normalized = symbol.trim().toUpperCase();
        return normalized.isBlank() ? null : normalized;
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String stringValue = String.valueOf(value).trim();
        return stringValue.isBlank() ? null : stringValue;
    }


    public List<PriceResponse> getMarketTicker24h() {
        try {
            String cachedJson = redisTemplate.opsForValue().get(REDIS_MARKET_TICKER_KEY);
            if (cachedJson != null && !cachedJson.isBlank()) {
                return objectMapper.readValue(cachedJson, new TypeReference<List<PriceResponse>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read market ticker cache: {}", e.getMessage());
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(binanceApiUrl)
                    .path("/ticker/24hr")
                    .build()
                    .toUri();

            ResponseEntity<List<Map<String, Object>>> responseEntity = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> body = responseEntity.getBody();
            if (body == null || body.isEmpty()) {
                return Collections.emptyList();
            }

            Set<String> excludedStablePairs = Set.of(
                    "USDCUSDT", "BUSDUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT"
            );

            List<PriceResponse> result = body.stream()
                    .map(this::mapToPriceResponse)
                    .filter(Objects::nonNull)
                    .filter(item -> item.getSymbol() != null)
                    .filter(item -> item.getSymbol().endsWith("USDT"))
                    .filter(item -> !excludedStablePairs.contains(item.getSymbol()))
                    .filter(item -> {
                        try {
                            return binanceService.isValidSymbol(item.getSymbol());
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .filter(item -> item.getPrice() != null && item.getChange() != null)
                    .toList();

            try {
                safeSet(
                        REDIS_MARKET_TICKER_KEY,
                        objectMapper.writeValueAsString(result),
                        MARKET_TICKER_CACHE_SECONDS
                );
            } catch (Exception e) {
                log.warn("Failed to cache market ticker: {}", e.getMessage());
            }

            return result;
        } catch (RestClientException e) {
            log.error("Binance market ticker request failed: {}", e.getMessage(), e);
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Unexpected market ticker error: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}