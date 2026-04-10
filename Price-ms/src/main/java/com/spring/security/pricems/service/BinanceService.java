package com.spring.security.pricems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class BinanceService {

    private final RestTemplate restTemplate;

    @Value("${binance.api.url}")
    private String binanceApiUrl;

    public boolean isValidSymbol(String symbol) {
        String upperSymbol = symbol.toUpperCase();

        try {
            String requestUrl = binanceApiUrl + "/ticker/price?symbol={symbol}";
            Map<String, Object> response = restTemplate.getForObject(requestUrl, Map.class, upperSymbol);

            boolean valid = response != null && response.containsKey("price");
            if (valid) {
                log.debug("Symbol validated on Binance: {}", upperSymbol);
            }
            return valid;
        } catch (RestClientException e) {
            log.warn("Binance symbol validation failed for {}: {}", upperSymbol, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error while validating symbol {}: {}", upperSymbol, e.getMessage(), e);
            return false;
        }
    }
}