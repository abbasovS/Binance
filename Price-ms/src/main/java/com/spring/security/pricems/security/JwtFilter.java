package com.spring.security.pricems.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.security.pricems.dao.dto.response.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();

        return path.startsWith("/actuator/health")
                || path.startsWith("/actuator/info")
                || path.startsWith("/ws-crypto/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if ("/api/crypto/watchlist/internal".equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Missing or invalid Authorization header", path);
            return;
        }

        String token = authHeader.substring(7);

        if (!jwtService.isTokenValid(token)) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Invalid or expired token", path);
            return;
        }

        String username = jwtService.extractUsername(token);
        String role = jwtService.extractRole(token);

        List<SimpleGrantedAuthority> authorities =
                (role == null || role.isBlank())
                        ? List.of()
                        : List.of(new SimpleGrantedAuthority(role.trim()));

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(username, null, authorities);

        SecurityContextHolder.getContext().setAuthentication(authentication);
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