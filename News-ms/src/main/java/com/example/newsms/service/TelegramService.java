package com.example.newsms.service;

import com.example.newsms.enums.NewsType;
import com.example.newsms.enums.Sentiment;
import com.example.newsms.model.NewsEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramService {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${user.service.url:http://localhost:8082}")
    private String userServiceUrl;

    private final RestTemplate restTemplate;

    @Async
    public synchronized void sendMessage(String message) {
        if (botToken == null || botToken.isBlank()) {
            log.info("Telegram token yoxdur.");
            return;
        }

        List<String> chatIds = fetchConnectedChatIds();
        if (chatIds.isEmpty()) return;

        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        int sent = 0;

        for (String chatId : chatIds) {
            try {
                Map<String, Object> params = new HashMap<>();
                params.put("chat_id", chatId);
                params.put("text", message);
                params.put("parse_mode", "HTML");
                params.put("disable_web_page_preview", true);

                restTemplate.postForEntity(url, params, String.class);
                sent++;

                // Limit qorunması: Hər 20 mesajdan sonra 1.5 saniyə gözlə (Telegram daha da sərtləşib)
                if (sent % 20 == 0) {
                    Thread.sleep(1500);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Telegram mesaj göndərilmədi. ChatId: {}, Xəta: {}", chatId, e.getMessage());
            }
        }

        log.info("Telegram mesajı göndərildi. {} / {} user", sent, chatIds.size());
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

    public void sendNews(NewsEntity news) {
        String header = getHeaderByNewsType(news.getType());
        String sentimentEmoji = getSentimentEmoji(news.getSentiment());

        String message = String.format(
                "%s <b>%s</b>\n\n" +
                        "📝 <b>Xülasə:</b> %s\n\n" +
                        "🪙 Simvol: #%s\n" +
                        "%s Sentiment: %s\n" +
                        "⭐ AI Reytinq: %.1f/10\n\n" +
                        "🔗 <a href=\"%s\">Xəbərin mənbəsi</a>",
                header,
                escapeHtml(news.getOriginalTitle()),
                escapeHtml(news.getSummaryAz()),
                news.getSymbol(),
                sentimentEmoji,
                news.getSentiment(),
                news.getAiRating(),
                news.getSourceUrl()
        );

        sendMessage(message);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private String getHeaderByNewsType(NewsType type) {
        if (type == null) return "📰 [XƏBƏR]";
        return (type == NewsType.MACRO_FED || type == NewsType.MACRO_TRUMP)
                ? "🏛 <b>[MAKRO]</b>"
                : "📰 <b>[XƏBƏR]</b>";
    }

    private String getSentimentEmoji(Sentiment sentiment) {
        if (sentiment == null) return "⚖️";
        switch (sentiment) {
            case BULLISH: return "🚀";
            case BEARISH: return "📉";
            default: return "⚖️";
        }
    }
}