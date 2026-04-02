package com.spring.security.pricems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
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
            // Güvenli URI Parametresi Kullanımı
            String requestUrl = binanceApiUrl + "/ticker/price?symbol={symbol}";
            restTemplate.getForObject(requestUrl, Map.class, upperSymbol);

            log.info("Sembol Binance'de bulundu: {}", upperSymbol);
            return true;
        } catch (Exception e) {
            log.warn("Sembol Binance'de bulunamadı veya bağlantı hatası: {}", upperSymbol);
            return false;
        }
    }
}