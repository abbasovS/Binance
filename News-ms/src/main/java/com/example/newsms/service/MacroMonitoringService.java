package com.example.newsms.service;

import com.example.newsms.dto.NewsItem;
import com.example.newsms.dto.NewsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class MacroMonitoringService {

    @Value("${cryptopanic.api.url}")
    private String cryptoPanicUrl;

    @Value("${cryptopanic.api.token}")
    private String cryptoPanicToken;

    private final NewsService newsService;
    private final RestTemplate restTemplate;

    @Scheduled(fixedRateString = "${cryptopanic.api.general-rate}")
    public void trackGeneralAndPortfolioNews() {
        pullAndProcessNews("general");
    }

    @Scheduled(fixedRateString = "${cryptopanic.api.macro-rate}",
            initialDelayString = "60000")
    public void analyzeTrumpFedAndSendTelegram() {
        pullAndProcessNews("macro");
    }

    public void pullAndProcessNews(String mode) {
        try {
            String fullUrl = cryptoPanicUrl + "?auth_token=" + cryptoPanicToken;
            ResponseEntity<NewsResponse> responseEntity =
                    restTemplate.getForEntity(fullUrl, NewsResponse.class);

            if (!responseEntity.getStatusCode().is2xxSuccessful() ||
                    responseEntity.getBody() == null) {
                log.error("News API xətası: {}", responseEntity.getStatusCode());
                return;
            }

            List<NewsItem> items = responseEntity.getBody().getResults();
            if (items == null || items.isEmpty()) {
                log.info("Yeni xəbər tapılmadı.");
                return;
            }

            List<NewsItem> filtered = items.stream()
                    .filter(item -> item.getTitle() != null &&
                            !item.getTitle().trim().isEmpty())
                    .filter(item -> shouldProcess(item.getTitle(), mode))
                    .limit("macro".equalsIgnoreCase(mode) ? 25 : 60)
                    .collect(Collectors.toList());

            // Batch-lərə böl — hər batch 10 xəbər (OpenAI limiti üçün):
            int batchSize = 10;
            for (int i = 0; i < filtered.size(); i += batchSize) {
                List<NewsItem> batch = filtered.subList(
                        i, Math.min(i + batchSize, filtered.size())
                );
                newsService.processNewsBatch(batch);

                // Batch-lər arasında qısa fasilə — rate limit üçün:
                if (i + batchSize < filtered.size()) {
                    Thread.sleep(1000); // 1 saniyə
                }
            }

            log.info("News pull tamamlandı. Mode: {}, cəmi: {}", mode, filtered.size());
        } catch (Exception e) {
            log.error("Makro/market monitorinq xətası: {}", e.getMessage());
        }
    }

    private boolean shouldProcess(String title, String mode) {
        if (title == null) return false;

        String normalized = title.toUpperCase();

        if ("macro".equalsIgnoreCase(mode)) {
            return normalized.contains("TRUMP") ||
                    normalized.contains("FED") ||
                    normalized.contains("FOMC") ||
                    normalized.contains("POWELL") ||
                    normalized.contains("SEC") ||
                    normalized.contains("INFLATION") ||
                    normalized.contains("CPI") ||
                    normalized.contains("GENSLER");
        }

        return !normalized.contains("SPONSORED") && !normalized.contains("PROMO");
    }


}