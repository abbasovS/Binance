package com.example.userms.security;

import com.example.userms.model.UserEntity;
import com.example.userms.repository.UserRepository;
import com.example.userms.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7).trim();
        if (jwt.isBlank()) {
            writeUnauthorized(response, "Invalid JWT");
            return;
        }

        final String userEmail;

        try {
            String tokenType = jwtService.extractTokenType(jwt);
            if (!"access".equals(tokenType)) {
                log.warn("Non-access token used on protected endpoint");
                writeUnauthorized(response, "Invalid token type");
                return;
            }

            userEmail = jwtService.extractUsername(jwt);
        } catch (ExpiredJwtException ex) {
            log.warn("Expired JWT received for path={}", request.getRequestURI());
            writeUnauthorized(response, "JWT expired");
            return;
        } catch (Exception ex) {
            log.warn("Invalid JWT received for path={}", request.getRequestURI());
            writeUnauthorized(response, "Invalid JWT");
            return;
        }

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserEntity user = userRepository.findByEmail(userEmail).orElse(null);

                if (user == null) {
                    writeUnauthorized(response, "User not found");
                    return;
                }

                if (!user.isActive()) {
                    log.warn("Blocked user attempted access: {}", userEmail);
                    writeUnauthorized(response, "User account is blocked");
                    return;
                }

                UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                        user.getEmail(),
                        user.getPassword(),
                        user.isActive(),
                        true,
                        true,
                        true,
                        List.of(new SimpleGrantedAuthority(user.getRole()))
                );

                if (jwtService.isTokenValid(jwt, userDetails, user.getTokenVersion())) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    writeUnauthorized(response, "Invalid JWT");
                    return;
                }
            } catch (ExpiredJwtException ex) {
                log.warn("JWT authentication failed for user={}, reason={}", userEmail, ex.getMessage());
                writeUnauthorized(response, "JWT expired");
                return;
            } catch (Exception ex) {
                log.warn("Invalid JWT received for path={}, reason={}", request.getRequestURI(), ex.getMessage());
                writeUnauthorized(response, "Invalid JWT");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), Map.of("message", message));
    }
}