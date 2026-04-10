package com.spring.security.pricems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    @Value("${telegram.bot.token}")
    private String botToken;

    private final RestTemplate restTemplate;

    @Async
    public void sendAlert(String chatId, String message) {
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is missing. Alert was not sent.");
            return;
        }

        if (chatId == null || chatId.isBlank()) {
            log.warn("Chat ID is empty. Telegram alert was not sent.");
            return;
        }

        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

            Map<String, Object> params = new HashMap<>();
            params.put("chat_id", chatId);
            params.put("text", message);

            restTemplate.postForEntity(url, params, String.class);
            log.info("Telegram alert sent successfully to chatId={}", chatId);
        } catch (Exception e) {
            log.warn("Telegram alert failed for chatId={}: {}", chatId, e.getMessage());
        }
    }
}