package com.example.apigateway.controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class FallBackController {

    @RequestMapping("/fallback")
    public Mono<ResponseEntity<String>> fallback() {
        return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body("Xidmət hazırda əlçatan deyil. Zəhmət olmasa bir az sonra yenidən cəhd edin."));
    }
}
