package com.example.technicalanalizems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TechnicalAnalysisService {

    private final RestTemplate restTemplate;

    public List<List<Object>> fetchRawData(String symbol) {
        String url = "https://api.binance.com/api/v3/klines?symbol=" + symbol.toUpperCase() + "&interval=1h&limit=100";

        try {
            List<List<Object>> response = restTemplate.getForObject(url, List.class);
            return response != null ? response : new ArrayList<>();
        } catch (RestClientException e) {
            log.error("Binance API-dən məlumat çəkilərkən xəta baş verdi. Symbol: {}, Xəta: {}", symbol, e.getMessage());
            // Xəta halında boş siyahı qaytarırıq ki, sistem çökməsin
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("Gözlənilməz xəta baş verdi. Symbol: {}, Xəta: {}", symbol, e.getMessage());
            return new ArrayList<>();
        }
    }
}