package com.example.newsms.configration;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(10)) // Qoşulma üçün max 10 saniyə
                .setReadTimeout(Duration.ofSeconds(60))    // AI cavabı üçün max 60 saniyə
                .build();
    }
}