package com.spring.security.pricems.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.security.pricems.dao.dto.response.ErrorResponse;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Component
public class InternalApiKeyFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${internal.api.key:}")
    private String internalApiKey;

    @PostConstruct
    public void validateInternalKey() {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            throw new IllegalStateException("internal.api.key is missing. Price-ms cannot start without it.");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"/api/crypto/watchlist/internal".equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String providedKey = request.getHeader("X-Internal-Api-Key");

        if (providedKey == null || providedKey.isBlank()) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden", "Missing internal API key", request.getRequestURI());
            return;
        }

        boolean matches = MessageDigest.isEqual(
                providedKey.getBytes(StandardCharsets.UTF_8),
                internalApiKey.getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden", "Invalid internal API key", request.getRequestURI());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeError(HttpServletResponse response,
                            int status,
                            String error,
                            String message,
                            String path) throws IOException {

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ErrorResponse errorResponse = new ErrorResponse(
                LocalDateTime.now(),
                status,
                error,
                message,
                path
        );

        objectMapper.writeValue(response.getOutputStream(), errorResponse);
    }
}