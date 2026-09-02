package com.spring.security.pricems.config;

import com.spring.security.pricems.security.InternalApiKeyFilter;
import com.spring.security.pricems.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final InternalApiKeyFilter internalApiKeyFilter;

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/prometheus", "/actuator/metrics").hasAuthority("ROLE_ADMIN")

                        .requestMatchers("/api/crypto/watchlist/internal").permitAll()

                        .requestMatchers("/ws-crypto/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/crypto/price/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/crypto/prices").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/crypto/watchlist/prices").authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(internalApiKeyFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        return request -> {
            CorsConfiguration config = new CorsConfiguration();

            List<String> origins = Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .toList();

            boolean hasPattern = origins.stream().anyMatch(origin -> origin.contains("*"));
            if (hasPattern) {
                config.setAllowedOriginPatterns(origins);
            } else {
                config.setAllowedOrigins(origins);
            }
            config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(List.of(
                    "Authorization",
                    "Content-Type",
                    "X-Internal-Api-Key",
                    "X-Correlation-Id"
            ));
            config.setExposedHeaders(List.of("Authorization", "X-Correlation-Id"));
            config.setAllowCredentials(true);
            config.setMaxAge(3600L);

            return config;
        };
    }
}