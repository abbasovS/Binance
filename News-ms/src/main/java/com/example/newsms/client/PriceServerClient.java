package com.example.newsms.client;

import com.example.newsms.configration.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(
        name = "price-ms",
        url = "${services.price-ms.url}",
        configuration = FeignConfig.class,
        fallback = PriceServerClientFallback.class // YENİ ƏLAVƏ EDİLDİ
)
public interface PriceServerClient {

    @GetMapping("/api/crypto/watchlist/internal")
    ResponseEntity<List<WatchList>> getWatchlist(@RequestParam("email") String email);
}