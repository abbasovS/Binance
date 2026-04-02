package com.example.tradems.client;

import org.springframework.stereotype.Component;

@Component
public class PriceClientFallback implements PriceClient {
    @Override
    public Double getRealtimePrice(String symbol) {

        System.err.println("Price-ms'e ulaşılamıyor! Sembol: " + symbol);

        throw new RuntimeException("Fiyat servisine şu an ulaşılamıyor, işlem iptal edildi.");
    }
}
