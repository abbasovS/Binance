package com.spring.security.pricems.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.security.pricems.dao.dto.response.PriceResponse;
import com.spring.security.pricems.dao.dto.response.WatchlistPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceService {

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${binance.api.url}")
    private String binanceApiUrl;

    private static final String REDIS_PRICE_PREFIX = "PRICE_";
    private static final String REDIS_24H_PREFIX = "PRICE_24H_";

    public Double getRealtimePrice(String symbol) {
        String upperSymbol = symbol.toUpperCase();
        String redisKey = REDIS_PRICE_PREFIX + upperSymbol;

        try {
            String cachedPrice = redisTemplate.opsForValue().get(redisKey);
            if (cachedPrice != null) {
                return Double.parseDouble(cachedPrice);
            }

            String requestUrl = binanceApiUrl + "/ticker/price?symbol={symbol}";
            Map<String, String> response = restTemplate.getForObject(requestUrl, Map.class, upperSymbol);

            if (response != null && response.containsKey("price")) {
                Double realPrice = Double.parseDouble(response.get("price"));
                redisTemplate.opsForValue().set(redisKey, String.valueOf(realPrice), 2, TimeUnit.SECONDS);
                return realPrice;
            }
        } catch (Exception e) {
            log.error("Binance sorgusunda hata ({}): {}", upperSymbol, e.getMessage());
        }
        return null;
    }

    public List<WatchlistPriceResponse> getWatchlistPrices(List<String> symbols) {
        return symbols.stream()
                .map(symbol -> {
                    Double price = getRealtimePrice(symbol);
                    return new WatchlistPriceResponse(symbol, price);
                })
                .collect(Collectors.toList());
    }

    // 2. YENİ VƏ OPTİMAL: BATCH QİYMƏT VƏ 24 SAATLIQ STATİSTİKA
    public List<PriceResponse> getBatchPrices(List<String> symbols) {
        List<String> upperSymbols = symbols.stream()
                .map(String::toUpperCase)
                .distinct()
                .collect(Collectors.toList());

        List<PriceResponse> results = new ArrayList<>();
        List<String> missingFromCache = new ArrayList<>();

        for (String sym : upperSymbols) {
            String cachedJson = redisTemplate.opsForValue().get(REDIS_24H_PREFIX + sym);
            if (cachedJson != null) {
                try {
                    PriceResponse cachedResponse = objectMapper.readValue(cachedJson, PriceResponse.class);
                    results.add(cachedResponse);
                } catch (Exception e) {
                    log.error("Redis-dən JSON oxunarkən xəta: {}", e.getMessage());
                    missingFromCache.add(sym);
                }
            } else {
                missingFromCache.add(sym);
            }
        }

        if (!missingFromCache.isEmpty()) {
            try {
                String joinedSymbols = missingFromCache.stream()
                        .map(s -> "\"" + s + "\"")
                        .collect(Collectors.joining(",", "[", "]"));

                String url = binanceApiUrl + "/ticker/24hr?symbols=" + joinedSymbols;

                List<Map<String, Object>> response = restTemplate.getForObject(url, List.class);

                if (response != null) {
                    for (Map<String, Object> item : response) {
                        PriceResponse pr = new PriceResponse();

                        pr.setSymbol(String.valueOf(item.get("symbol")));
                        pr.setPrice(new BigDecimal(String.valueOf(item.get("lastPrice"))));
                        pr.setChange(new BigDecimal(String.valueOf(item.get("priceChangePercent"))));
                        pr.setHigh(new BigDecimal(String.valueOf(item.get("highPrice"))));
                        pr.setLow(new BigDecimal(String.valueOf(item.get("lowPrice"))));
                        pr.setVolume(new BigDecimal(String.valueOf(item.get("quoteVolume")))); // USDT Həcmi
                        pr.setBaseVolume(new BigDecimal(String.valueOf(item.get("volume")))); // Coin Həcmi
                        pr.setVwap(new BigDecimal(String.valueOf(item.get("weightedAvgPrice"))));
                        pr.setPriceChangeAmt(new BigDecimal(String.valueOf(item.get("priceChange"))));

                        results.add(pr);

                        redisTemplate.opsForValue().set(
                                REDIS_24H_PREFIX + pr.getSymbol(),
                                objectMapper.writeValueAsString(pr),
                                10, TimeUnit.SECONDS
                        );
                    }
                }
            } catch (Exception e) {
                log.error("Batch Binance 24hr sorğusunda xəta: {}", e.getMessage());
            }
        }

        return results;
    }
}