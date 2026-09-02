package com.example.tradems.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;

@Component
public class JwtUtil {

    @Value("${SECRET_KEY:}")
    private String secretKey;

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @PostConstruct
    public void validateSecret() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("SECRET_KEY is missing. Trade-ms cannot start without it.");
        }
        getSignInKey();
    }

    public String extractEmailFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new JwtException("Token tapılmadı və ya format səhvdir!");
        }

        try {
            String token = authHeader.substring(7);

            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSignInKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return claims.getSubject();
        } catch (Exception e) {
            throw new JwtException("Token etibarsızdır, saxtalaşdırılıb və ya vaxtı bitib!", e);
        }
    }
}