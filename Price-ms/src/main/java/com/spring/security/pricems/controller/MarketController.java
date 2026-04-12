package com.spring.security.pricems.controller;


import com.spring.security.pricems.dao.dto.response.PriceResponse;
import com.spring.security.pricems.service.PriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/market")
public class MarketController {

    private final PriceService priceService;

    @GetMapping("/ticker/24hr")
    public ResponseEntity<List<PriceResponse>> getMarketTicker24h() {
        return ResponseEntity.ok(priceService.getMarketTicker24h());
    }
}
