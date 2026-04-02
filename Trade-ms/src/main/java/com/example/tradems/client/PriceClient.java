package com.example.tradems.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "price-ms", url = "${PRICE_MS_URL:}", fallback = PriceClientFallback.class)
public interface PriceClient {

    @GetMapping("/api/crypto/price/{symbol}")
    Double getRealtimePrice(@PathVariable("symbol") String symbol);
}