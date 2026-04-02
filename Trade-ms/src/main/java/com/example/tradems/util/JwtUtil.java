package com.example.tradems.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders; // Bunu əlavə etdik
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;

@Component
public class JwtUtil {

    @Value("${SECRET_KEY}")
    private String secretKey;

    private Key getSignInKey() {
        // User-ms-də olduğu kimi Base64 decode edirik
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractEmailFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token tapılmadı və ya format səhvdir!");
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
            System.out.println("JWT Validasiya Xətası: " + e.getMessage());
            throw new RuntimeException("Token etibarsızdır, saxtalaşdırılıb və ya vaxtı bitib!");
        }
    }
}