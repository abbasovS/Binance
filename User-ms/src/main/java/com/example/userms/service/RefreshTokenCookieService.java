package com.example.userms.service;


import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class RefreshTokenCookieService {

    @Value("${app.auth.refresh-cookie-name:refreshToken}")
    private String refreshCookieName;

    @Value("${app.auth.refresh-cookie-secure:true}")
    private String secureRaw;

    @Value("${app.auth.refresh-cookie-same-site:Strict}")
    private String sameSite;

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    public void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        String normalizedSameSite = normalizeSameSite(sameSite);
        boolean secure = resolveSecure(normalizedSameSite);
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .sameSite(normalizedSameSite)
                .maxAge(refreshExpirationMs / 1000)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearRefreshTokenCookie(HttpServletResponse response) {
        String normalizedSameSite = normalizeSameSite(sameSite);
        boolean secure = resolveSecure(normalizedSameSite);
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .sameSite(normalizedSameSite)
                .maxAge(0)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public String extractRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }

        for (Cookie cookie : request.getCookies()) {
            if (refreshCookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    private boolean resolveSecure(String normalizedSameSite) {
        boolean configuredSecure = Boolean.parseBoolean(secureRaw);
        if ("None".equals(normalizedSameSite)) {
            return true;
        }
        return configuredSecure;
    }

    private String normalizeSameSite(String configuredSameSite) {
        if (configuredSameSite == null || configuredSameSite.isBlank()) {
            return "Strict";
        }

        return switch (configuredSameSite.trim().toLowerCase()) {
            case "lax" -> "Lax";
            case "none" -> "None";
            default -> "Strict";
        };
    }
}
