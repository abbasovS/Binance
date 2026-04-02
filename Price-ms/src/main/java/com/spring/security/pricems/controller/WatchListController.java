package com.spring.security.pricems.controller;

import com.spring.security.pricems.dao.dto.model.WatchList;
import com.spring.security.pricems.service.WatchListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/crypto")
public class WatchListController {

    private final WatchListService watchlistService;

    @PostMapping("/add/{symbol}")
    public ResponseEntity<Void> addSymbol(@PathVariable String symbol, Principal principal) {
        watchlistService.addWatchListSymbol(symbol, principal.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/watchlist")
    public ResponseEntity<List<WatchList>> getWatchlist(Principal principal) {
        return ResponseEntity.ok(watchlistService.getAllWatchlist(principal.getName()));
    }

    @DeleteMapping("/remove/{symbol}")
    public ResponseEntity<Void> deleteWatchlist(@PathVariable String symbol, Principal principal) {
        watchlistService.deleteWatchListSymbol(symbol, principal.getName());
        return ResponseEntity.ok().build();
    }
    @GetMapping("/watchlist/internal")
    public ResponseEntity<List<WatchList>> getWatchlistInternal(@RequestParam("email") String email) {
        return ResponseEntity.ok(watchlistService.getAllWatchlist(email));
    }
}
