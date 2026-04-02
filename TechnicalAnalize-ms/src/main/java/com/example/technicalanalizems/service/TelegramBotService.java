package com.example.technicalanalizems.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramBotService {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${user.service.url:http://localhost:8082}")
    private String userServiceUrl;

    private final RestTemplate restTemplate;

    // Bütün aktiv istifadəçilərə qrafiki göndərir
    public void sendImageToAll(byte[] imageBytes, String caption) {
        List<String> chatIds = fetchConnectedChatIds();

        if (chatIds.isEmpty()) {
            log.info("Telegram bağlı istifadəçi tapılmadı. Şəkil göndərilmədi.");
            return;
        }

        for (String chatId : chatIds) {
            sendImageToChat(chatId, imageBytes, caption);
        }
    }

    private void sendImageToChat(String chatId, byte[] imageBytes, String caption) {
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendPhoto";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("chat_id", chatId);
            body.add("caption", caption);

            // Şəkli "file" formatına salırıq
            body.add("photo", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return "analysis.png";
                }
            });

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, requestEntity, String.class);

            log.info("✅ Analiz şəkli uğurla göndərildi. ChatID: {}", chatId);
        } catch (Exception e) {
            log.error("❌ Telegram şəkil göndərilərkən xəta: {}", e.getMessage());
        }
    }

    private List<String> fetchConnectedChatIds() {
        try {
            String url = userServiceUrl + "/api/user/telegram/chats";
            ResponseEntity<List<String>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null, new ParameterizedTypeReference<>() {}
            );
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception exception) {
            log.warn("User-ms telegram chat id-ləri alınmadı: {}", exception.getMessage());
            return Collections.emptyList();
        }
    }
}