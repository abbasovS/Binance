package com.spring.security.pricems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${user.service.url:http://localhost:8082}")
    private String userServiceUrl;

    private final RestTemplate restTemplate;

    public void sendAlert(String message) {
        try {
            List<String> chatIds = fetchConnectedChatIds();

            if (chatIds.isEmpty()) {
                log.info("Telegram bağlı istifadəçi tapılmadı. Mesaj göndərilmədi.");
                return;
            }

            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

            for (String chatId : chatIds) {
                CompletableFuture.runAsync(() -> {
                    try {
                        java.util.Map<String, Object> params = new java.util.HashMap<>();
                        params.put("chat_id", chatId);
                        params.put("text", message);

                        restTemplate.postForEntity(url, params, String.class);
                    } catch (Exception e) {
                        log.warn("❌ Telegram mesajı göndərilə bilmədi (ChatID: {}): {}", chatId, e.getMessage());
                    }
                });
            }

            log.info("✅ Telegram mesajları arxa planda göndərilməyə başlandı. User sayı: {}", chatIds.size());
        } catch (Exception e) {
            log.error("Telegram xəbərdarlığı prosesində xəta: {}", e.getMessage());
        }
    }

    private List<String> fetchConnectedChatIds() {
        try {
            String url = userServiceUrl + "/api/user/telegram/chats";

            ResponseEntity<List<String>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<>() {}
            );

            if (response.getBody() == null) {
                return Collections.emptyList();
            }

            return response.getBody();
        } catch (Exception exception) {
            log.warn("User-ms telegram chat id-ləri alınmadı: {}", exception.getMessage());
            return Collections.emptyList();
        }
    }
}