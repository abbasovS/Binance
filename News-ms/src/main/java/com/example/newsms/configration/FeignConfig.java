package com.example.newsms.configration;


import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignConfig {

    @Value("${internal.api.key}")
    private String internalApiKey;

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String authorization = request.getHeader("Authorization");
                if (authorization != null) {
                    requestTemplate.header("Authorization", authorization);
                }
            }
        };
    }

    @Bean
    public RequestInterceptor internalApiKeyInterceptor() {
        return requestTemplate ->
                requestTemplate.header("X-Internal-Api-Key", internalApiKey);
    }



}
