package com.example.userms.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitConfig {

    @Bean("loginBuckets")
    public Map<String, Bucket> loginBuckets() {
        return new ConcurrentHashMap<>();
    }

    @Bean("verifyBuckets")
    public Map<String, Bucket> verifyBuckets() {
        return new ConcurrentHashMap<>();
    }

    @Bean("signupBuckets")
    public Map<String, Bucket> signupBuckets() {
        return new ConcurrentHashMap<>();
    }

    @Bean("telegramWebhookBuckets")
    public Map<String, Bucket> telegramWebhookBuckets() {
        return new ConcurrentHashMap<>();
    }

    public static Bucket newBucket(long capacity, Duration duration) {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(capacity, duration))
                .build();
    }
}