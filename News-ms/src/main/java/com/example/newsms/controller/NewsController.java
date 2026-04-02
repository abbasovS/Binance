package com.example.newsms.controller;

import com.example.newsms.dto.NewsFeedResponse;
import com.example.newsms.dto.NewsTestRequest;
import com.example.newsms.service.MacroMonitoringService;
import com.example.newsms.service.NewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
@Slf4j
public class NewsController {
    private final NewsService newsService;
    private final MacroMonitoringService macroMonitoringService;

    @PostMapping("/process")
    public ResponseEntity<String> processNews(@RequestBody NewsTestRequest request) {
        log.info("Test sorğusu qəbul edildi: {}", request.getTitle());

        try {
            newsService.processNewsFlow(
                    request.getTitle(),
                    request.getSource(),
                    request.getUrl()
            );
            return ResponseEntity.ok("Xəbər uğurla emal edildi.");
        } catch (Exception e) {
            log.error("Xəbər emal edilərkən xəta: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Xəta baş verdi: " + e.getMessage());
        }
    }

    @GetMapping("/global")
    public List<NewsFeedResponse> getGlobalNews(@RequestParam(defaultValue = "20") int limit) {
        return newsService.getGlobalNews(limit);
    }

    @GetMapping("/portfolio")
    public List<NewsFeedResponse> getPortfolioNews(
            @RequestParam String email,
            @RequestParam(defaultValue = "20") int limit) {
        return newsService.getPortfolioNews(email, limit);
    }

    @GetMapping("/latest")
    public List<NewsFeedResponse> getLatestNews(@RequestParam(defaultValue = "40") int limit) {
        return newsService.getLatestNews(limit);
    }


}
