package com.example.userms.security;

import com.example.userms.config.RateLimitConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    @Qualifier("loginBuckets")
    private final Map<String, Bucket> loginBuckets;

    @Qualifier("verifyBuckets")
    private final Map<String, Bucket> verifyBuckets;

    @Qualifier("signupBuckets")
    private final Map<String, Bucket> signupBuckets;

    @Qualifier("telegramWebhookBuckets")
    private final Map<String, Bucket> telegramWebhookBuckets;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        String clientKey = resolveClientKey(request);

        if (matches(method, path, "POST", "/api/user/login")) {
            if (!tryConsume(loginBuckets, clientKey, 10, Duration.ofMinutes(1))) {
                writeTooManyRequests(response, "Login limiti aşıldı. Bir az sonra yenidən cəhd edin.");
                return;
            }
        }

        if (matches(method, path, "POST", "/api/user/verify")) {
            if (!tryConsume(verifyBuckets, clientKey, 15, Duration.ofMinutes(10))) {
                writeTooManyRequests(response, "Verify limiti aşıldı. Bir az sonra yenidən cəhd edin.");
                return;
            }
        }

        if (matches(method, path, "POST", "/api/user/signup")) {
            if (!tryConsume(signupBuckets, clientKey, 5, Duration.ofMinutes(10))) {
                writeTooManyRequests(response, "Signup limiti aşıldı. Bir az sonra yenidən cəhd edin.");
                return;
            }
        }

        if (matches(method, path, "POST", "/api/telegram/webhook")) {
            if (!tryConsume(telegramWebhookBuckets, clientKey, 30, Duration.ofMinutes(1))) {
                writeTooManyRequests(response, "Webhook limiti aşıldı.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean matches(String requestMethod, String requestPath, String expectedMethod, String expectedPath) {
        return expectedMethod.equalsIgnoreCase(requestMethod) && expectedPath.equals(requestPath);
    }

    private boolean tryConsume(Map<String, Bucket> buckets, String key, long capacity, Duration duration) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> RateLimitConfig.newBucket(capacity, duration));
        boolean allowed = bucket.tryConsume(1);

        if (!allowed) {
            log.warn("Rate limit exceeded. key={}, capacity={}, duration={}", key, capacity, duration);
        }

        return allowed;
    }

    private String resolveClientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), Map.of("message", message));
    }
}