package com.example.newsms.client;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import java.util.Collections;
import java.util.List;

@Component
public class PriceServerClientFallback implements PriceServerClient {

    @Override
    public ResponseEntity<List<WatchList>> getWatchlist(String email) {
        System.err.println("XƏBƏRDARLIQ: Price-ms servisinə qoşulmaq mümkün deyil! Boş siyahı qaytarılır.");

        // Sistemin çökməməsi üçün boş bir WatchList qaytarırıq
        return ResponseEntity.ok(Collections.emptyList());
    }
}