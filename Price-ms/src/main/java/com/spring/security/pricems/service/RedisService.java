package com.spring.security.pricems.service;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
@Service
@RequiredArgsConstructor
public class RedisService {

    private final RedisTemplate<String, Object> redisTemplate;
        public void savePrice(String symbol, Object price) {
        redisTemplate.opsForValue().set(symbol,price);
    }

    public Object getLastPrice(String symbol) {
        return redisTemplate.opsForValue().get(symbol);
    }





}
