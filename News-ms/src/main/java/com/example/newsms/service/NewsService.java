package com.example.newsms.service;

import com.example.newsms.client.PriceServerClient;
import com.example.newsms.client.WatchList;
import com.example.newsms.dto.AiAnalysisResponse;
import com.example.newsms.dto.NewsFeedResponse;
import com.example.newsms.dto.NewsItem;
import com.example.newsms.enums.NewsType;
import com.example.newsms.enums.Sentiment;
import com.example.newsms.model.NewsEntity;
import com.example.newsms.repository.NewsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsService {
    private final AiService aiService;
    private final NewsRepository newsRepository;
    private final TelegramService telegramService;
    private final PriceServerClient priceServerClient;
    public void processNewsFlow(String title, String source, String url) {
        log.info("Xəbər emalı başladı: {}", title);

        String safeUrl = (url != null && !url.trim().isEmpty())
                ? url
                : "https://cryptopanic.com/news/" + Math.abs(title.hashCode()) + "_" + System.currentTimeMillis();

        if (newsRepository.existsBySourceUrl(safeUrl)) {
            return;
        }

        AiAnalysisResponse analysis = aiService.analyze(title);

        boolean isMacro = isMacroType(analysis.getNewsType());
        String symbol = analysis.getSymbol() != null ?
                analysis.getSymbol().toUpperCase() : "MARKET";
        boolean isCoinSpecific = !symbol.equals("MARKET") && !symbol.equals("N/A");

        if (isMacro || isCoinSpecific) {
            NewsEntity news = NewsEntity.builder()
                    .originalTitle(title)
                    .sourceName(source)
                    .sourceUrl(safeUrl)
                    .symbol(symbol)
                    .summaryEn(analysis.getSummaryEn())
                    .summaryAz(analysis.getSummaryAz())
                    .sentiment(parseSentiment(analysis.getSentiment()))
                    .type(parseType(analysis.getNewsType()))
                    .aiRating(analysis.getAiRating())
                    .global(isMacro)
                    .build();

            saveAndNotify(news, safeUrl);
        }
    }

    public List<NewsFeedResponse> getGlobalNews(int limit) {
        return newsRepository.findByGlobalTrueOrderByCreatedAtDesc(PageRequest.of(0, limit))
                .stream().map(this::toDto).toList();
    }

    public List<NewsFeedResponse> getPortfolioNews(String email, int limit) {
        log.info("1. Portfolio news sorğusu gəldi. Email: {}", email);

        List<WatchList> watchlist = null;
        try {
            ResponseEntity<List<WatchList>> response = priceServerClient.getWatchlist(email);
            watchlist = (response != null) ? response.getBody() : null;
        } catch (Exception e) {
            log.error("Price-ms xidmətindən Watchlist çəkilərkən xəta baş verdi: {}", e.getMessage());
            return Collections.emptyList();
        }

        if (watchlist == null || watchlist.isEmpty()) {
            log.warn("2. DIQQƏT: Bu email ({}) üçün Watchlist BOŞ gəldi və ya tapılmadı!", email);
            return Collections.emptyList();
        }

        log.info("3. Watchlist uğurla çəkildi. İçindəki coinlər: {}", watchlist);

        List<String> targetSymbols = watchlist.stream()
                .filter(w -> w.getSymbol() != null && !w.getSymbol().isBlank())
                .flatMap(w -> {
                    String full = w.getSymbol().toUpperCase();
                    String shortSym = full.replace("USDT", "");
                    return java.util.stream.Stream.of(full, shortSym);
                })
                .distinct()
                .collect(Collectors.toList());

        log.info("4. Axtarışa gedəcək təmizlənmiş simvollar: {}", targetSymbols);

        if (targetSymbols.isEmpty()) {
            return Collections.emptyList();
        }


        var newsEntities = newsRepository.findBySymbolInOrderByCreatedAtDesc(targetSymbols, PageRequest.of(0, limit));

        log.info("5. Bazadan tapılan xəbər sayı: {}", newsEntities.size());

        return newsEntities.stream()
                .map(this::toDto)
                .toList();
    }

    public List<NewsFeedResponse> getLatestNews(int limit) {
        return newsRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit))
                .stream().map(this::toDto).toList();
    }


    public void processNewsBatch(List<NewsItem> items) {
        List<NewsItem> newItems = items.stream()
                .filter(item -> item.getUrl() == null ||
                        !newsRepository.existsBySourceUrl(item.getUrl()))
                .collect(Collectors.toList());

        if (newItems.isEmpty()) {
            log.info("Bütün xəbərlər artıq bazadadır.");
            return;
        }

        List<String> titles = newItems.stream()
                .map(NewsItem::getTitle)
                .collect(Collectors.toList());

        List<AiAnalysisResponse> analyses = aiService.analyzeBatch(titles);

        for (int i = 0; i < newItems.size(); i++) {
            NewsItem item = newItems.get(i);
            AiAnalysisResponse analysis = i < analyses.size() ?
                    analyses.get(i) : aiService.fallbackResponse(item.getTitle());

            boolean isMacro = isMacroType(analysis.getNewsType());
            String symbol = analysis.getSymbol() != null ?
                    analysis.getSymbol().toUpperCase() : "MARKET";
            boolean isCoinSpecific = !symbol.equals("MARKET") && !symbol.equals("N/A");

            if (isMacro || isCoinSpecific) {
                String safeUrl = buildSafeUrl(item);

                NewsEntity news = NewsEntity.builder()
                        .originalTitle(item.getTitle())
                        .sourceName(buildSourceName(item))
                        .sourceUrl(safeUrl)
                        .symbol(symbol)
                        .summaryEn(analysis.getSummaryEn())
                        .summaryAz(analysis.getSummaryAz())
                        .sentiment(parseSentiment(analysis.getSentiment()))
                        .type(parseType(analysis.getNewsType()))
                        .aiRating(analysis.getAiRating())
                        .global(isMacro)
                        .build();

                saveAndNotify(news, safeUrl);
            }
        }
    }

    private void saveAndNotify(NewsEntity news, String url) {
        try {
            newsRepository.save(news);
            telegramService.sendNews(news);
        } catch (Exception e) {
            log.warn("Xəbər artıq mövcuddur və ya saxlanılarkən xəta baş verdi: {} - {}", url, e.getMessage());
        }
    }

    private Sentiment parseSentiment(String value) {
        if (value == null || value.isBlank()) return Sentiment.NEUTRAL;
        try { return Sentiment.valueOf(value.toUpperCase(Locale.ROOT)); }
        catch (Exception ex) { return Sentiment.NEUTRAL; }
    }

    private NewsType parseType(String value) {
        if (value == null || value.isBlank()) return NewsType.GLOBAL_MARKET;
        try { return NewsType.valueOf(value.toUpperCase(Locale.ROOT)); }
        catch (Exception ex) { return NewsType.GLOBAL_MARKET; }
    }

    private boolean isMacroType(String type) {
        if (type == null) return false;
        return type.equalsIgnoreCase("MACRO_FED") ||
                type.equalsIgnoreCase("MACRO_TRUMP") ||
                type.equalsIgnoreCase("GLOBAL_MARKET");
    }

    private NewsFeedResponse toDto(NewsEntity newsEntity) {
        return NewsFeedResponse.builder()
                .id(newsEntity.getId())
                .originalTitle(newsEntity.getOriginalTitle())
                .sourceUrl(newsEntity.getSourceUrl())
                .sourceName(newsEntity.getSourceName())
                .summaryAz(newsEntity.getSummaryAz())
                .summaryEn(newsEntity.getSummaryEn())
                .symbol(newsEntity.getSymbol())
                .sentiment(newsEntity.getSentiment())
                .type(newsEntity.getType())
                .global(newsEntity.isGlobal())
                .createdAt(newsEntity.getCreatedAt())
                .build();
    }

    private String buildSafeUrl(NewsItem item) {
        return (item.getUrl() != null && !item.getUrl().isBlank())
                ? item.getUrl()
                : "https://cryptopanic.com/news/" + Math.abs(item.getTitle().hashCode()) + "_" + System.currentTimeMillis();
    }

    private String buildSourceName(NewsItem item) {
        if (item.getSourceName() != null && !item.getSourceName().trim().isEmpty()) {
            return item.getSourceName();
        }
        if (item.getDomain() != null && !item.getDomain().trim().isEmpty()) {
            return item.getDomain().replaceAll("(?i)\\.(com|org|net|co|io)$", "").toUpperCase();
        }
        return "Crypto Market";
    }
}