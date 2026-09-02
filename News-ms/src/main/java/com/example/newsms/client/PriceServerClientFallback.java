package com.example.newsms.client;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import java.util.Collections;
import java.util.List;

@Component
@Slf4j
public class PriceServerClientFallback implements PriceServerClient {

    @Override
    public ResponseEntity<List<WatchList>> getWatchlist(String email) {
        log.warn("Price-ms servisinə qoşulmaq mümkün deyil. email={} üçün boş watchlist qaytarılır.", email);
        return ResponseEntity.ok(Collections.emptyList());
    }
}