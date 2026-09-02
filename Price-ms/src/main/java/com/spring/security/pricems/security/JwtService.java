package com.spring.security.pricems.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @PostConstruct
    public void validateSecret() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("SECRET_KEY is missing. Price-ms cannot start without jwt.secret.");
        }
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            String username = extractUsername(token);
            return username != null && !username.isBlank() && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        Object role = claims.get("role");
        return role == null ? null : String.valueOf(role);
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new java.util.Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}