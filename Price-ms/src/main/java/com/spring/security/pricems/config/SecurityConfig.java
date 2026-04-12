package com.spring.security.pricems.config;

import com.spring.security.pricems.security.InternalApiKeyFilter;
import com.spring.security.pricems.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final InternalApiKeyFilter internalApiKeyFilter;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();

                    List<String> origins = Arrays.stream(allowedOrigins.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isBlank())
                            .toList();

                    config.setAllowedOrigins(origins);
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Internal-Api-Key"));
                    config.setAllowCredentials(true);
                    config.setMaxAge(3600L);

                    return config;
                }))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/ws-crypto/**").permitAll()
                        .requestMatchers("/api/market/**").permitAll()
                        .requestMatchers("/api/crypto/watchlist/internal").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/crypto/watchlist").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/crypto/watchlist/prices").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/crypto/alert/all").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/crypto/prices").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/crypto/price/**").authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/crypto/add/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/crypto/remove/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/crypto/alert/add").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/crypto/alert/delete/**").authenticated()

                        .anyRequest().denyAll()
                )
                .addFilterBefore(internalApiKeyFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}