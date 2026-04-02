package com.spring.security.pricems.controller;

import com.spring.security.pricems.dao.dto.response.PriceResponse;
import com.spring.security.pricems.dao.dto.response.WatchlistPriceResponse;
import com.spring.security.pricems.service.PriceService;
import com.spring.security.pricems.service.WatchListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/crypto")
public class PriceController {

    private final PriceService priceService;
    private final WatchListService watchListService;

    @GetMapping("/price/{symbol}")
    public ResponseEntity<Double> getRealtimePrice(@PathVariable String symbol) {
        Double price = priceService.getRealtimePrice(symbol);
        if (price == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(price);
    }

    // Watchlist-dəki bütün coinlərin canlı qiymətlərini qaytarır
    @GetMapping("/watchlist/prices")
    public ResponseEntity<List<WatchlistPriceResponse>> getWatchlistPrices(Principal principal) {
        List<String> symbols = watchListService.getAllWatchlist(principal.getName())
                .stream()
                .map(wl -> wl.getSymbol())
                .toList();
        return ResponseEntity.ok(priceService.getWatchlistPrices(symbols));
    }


    // PriceController.java — mövcud endpoint-ə ƏLAVƏ et (silmə)
    // PriceController.java içində dəyişdiriləcək sətir:
    @GetMapping("/prices")
    public ResponseEntity<List<PriceResponse>> getBatchPrices(
            @RequestParam("symbols") List<String> symbols) { // <-- "symbols" əlavə edildi

        if (symbols == null || symbols.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (symbols.size() > 50) {
            symbols = symbols.subList(0, 50);
        }
        return ResponseEntity.ok(priceService.getBatchPrices(symbols));
    }

}